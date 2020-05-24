import debug from 'debug'
import sleep from 'await-sleep'
import {pick} from 'lodash'
import {transaction} from 'objection'

const info = debug('CCVault:pollMarketTransactions')

export default async function pollMarketTransactions(ctx) {
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getMarketClient() // eth lib with market config

  const sleepTime = ctx.cryptoClient.getPollDelay() * 1000
  let running = true
  while (running) {
    await syncPendingDeposits(ctx)
    await syncDaemon(ctx)
    info('Finished polling transactions, waiting for %o mls...', sleepTime)
    await sleep(sleepTime)
  }
}

export async function syncDaemon(ctx) {
  const blockDiff = await calculateBlockDiff(ctx)

  // while we are behind the block chain, we need to process blocks:
  if(!blockDiff.inSync) {
    await syncLastDeposits(ctx, blockDiff.lastProcessedBlock)
    info('Last processed block updated to %o.', blockDiff.lastChainBlock)
  } else {
    info('Transactions are in sync at block %o.', blockDiff.lastChainBlock)
  }

  await ctx.Cache.add(blockDiff.cacheKey, blockDiff.lastChainBlock)
}

export async function syncLastDeposits(ctx, lastProcessedBlock, maxProcessBlock) {
  const deposits = await ctx.cryptoClient.listTransactionsSinceBlock(lastProcessedBlock, maxProcessBlock)
  info('Found %o transactions to update since block %o.', deposits.length, lastProcessedBlock)

  for (const deposit of deposits) {
    let account = await ctx.MarketAccounts.find(deposit.address)
    if (account) {
      await updateDeposit(ctx, deposit)
    }
  }
}

export async function calculateBlockDiff(ctx) {
  info('Calculating last block diff...')

  const cacheKey = `${ctx.CURRENCY}_marketLastBlockCount`
  const lastChainBlock = await ctx.cryptoClient.countBlocks()
  const lastProcessedBlock = await ctx.Cache.get(cacheKey) || lastChainBlock

  const blockDiff = {
    cacheKey,
    lastChainBlock, lastProcessedBlock,
    inSync: lastProcessedBlock === lastChainBlock,
  }
  info('Block diff: %o', blockDiff)

  return blockDiff
}

export async function syncPendingDeposits(ctx) {
  info('Syncing pending transactions...')

  const filter = { currency: ctx.CURRENCY, amountWasLoaded: false }
  const pendingTransactions = await ctx.MarketTransactions.findAll(filter, { limit: 100 })

  for (const pTransaction of pendingTransactions) {
    const chainTransactionData = await ctx.cryptoClient.findTransaction(pTransaction.txHash)
    await updateDeposit(ctx, chainTransactionData)
  }
}

async function updateDeposit(ctx, chainTransactionData) {
  info('Updating transaction %o', chainTransactionData.txHash)

  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  const tx = await ctx.MarketTransactions.createOrUpdateByTxHash(chainTransactionData, opts)
  if (tx.shouldLoadWalletDeposit()) {
    await ctx.MarketAccounts.changeBalance(chainTransactionData.address, chainTransactionData.amount, opts)
    await ctx.MarketTransactions.setAmountLoaded(chainTransactionData.txHash, opts)
    await addQueueMessage(ctx, chainTransactionData, opts)
  }
  await opts.transaction.commit()
}

async function addQueueMessage(ctx, chainTransactionData, opts) {
  info('Adding queue message for %o', chainTransactionData.txHash)

  const account = await ctx.MarketAccounts.find(chainTransactionData.address, opts)

  const sqsConfig = ctx.config.aws.sqs.market
  const params = {
    MessageGroupId: sqsConfig.messageGroupId,
    MessageBody: JSON.stringify({
      transaction: pick(chainTransactionData, [
        'txHash', 'to', 'from', 'amount', 'currency',
      ]),
      account: pick(account, [
        'address', 'balance', 'currency',
      ])
    }),
    QueueUrl: sqsConfig.url,
    DelaySeconds: 0,
  }

  await ctx.sqs.sendMessage(params).promise()
}
