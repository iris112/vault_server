import debug            from 'debug'
import sleep            from 'await-sleep'
import { transaction }  from 'objection'
import { Big }          from '@cc-dev/math'
import config           from './../../config'

const info = debug('CCVault:pollCryptoDaemon')

export default async function pollCryptoDaemon(ctx) {
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  const sleepTime = ctx.cryptoClient.getPollDelay() * 1000
  while (true) {
    await syncDaemon(ctx)
    await checkBankLevels(ctx)
    info('Finished polling transactions, waiting for %o mls...', sleepTime)
    await sleep(sleepTime)
  }
}

export async function checkBankLevels(ctx) {
  if(!ctx.cryptoClient.shouldMoveToColdStorage()) return
  // get bank balance
  const hotWalletBalance = await ctx.cryptoClient.getWalletBalance()

  const currentBig  = Big(hotWalletBalance)
  const minBig      = Big(ctx.cryptoClient.getColdStorageMinBalance())
  const maxBig      = Big(ctx.cryptoClient.getColdStorageMaxBalance())
  const optimalBig   = (minBig.plus(maxBig)).div(2) // the mean between the 2 levels

  if(currentBig.lt(minBig)) { // should request more funds from cold storage
    if(ctx.notified) return // if we already send a notification then we return

    // funds level in hot storage have dropped below minimum level
    // we need to request more funds from the cold wallet so
    // we notify CC personel to manually transfer some funds to hot wallet

    const amountToSend = optimalBig.minus(currentBig)
    const body = `Requested ${amountToSend} ${ctx.CURRENCY} from the cold wallet.`
    // Send SMS:
    if(config.sms.enabled) {
      await ctx.twilio.messages.create({ body, from: config.sms.from, to: config.sms.to })
      ctx.notified = true
    }
  } else if(currentBig.gt(maxBig)) { // should deposit difference to cold storage

    // funds level in hot storage have exceeded max level
    // so we transfer some of the funds into the cold wallet

    const diffBig = currentBig.minus(optimalBig)
    const amount = diffBig.toString()
    const coldStorageAddr = ctx.cryptoClient.getColdStorageAddress()

    await ctx.cryptoClient.sendToAddress(coldStorageAddr, amount)

  } else { // should reset notification state back to normal

    // funds level in hot storage is nominal
    // so we clear the notification state
    ctx.notified = false
  }
}

export async function syncDaemon(ctx) {
  const blockDiff = await calculateBlockDiff(ctx)
  let maxProcessBlock

  if(!blockDiff.inSync) {

    // Check for a max number of blocks to process otherwise there might be too many blocks unsynced
    // since the last polling and we might never get to the last block before the script or the daemon
    // crashes. If that's the case then on the next daemon restart we'd start over.
    if (
      ctx.cryptoClient.getMaxBlocksToProcess() &&
      blockDiff.lastProcessedBlock + ctx.cryptoClient.getMaxBlocksToProcess() < blockDiff.lastChainBlock
    ) {
      maxProcessBlock = blockDiff.lastProcessedBlock + ctx.cryptoClient.getMaxBlocksToProcess()
    } else {
      maxProcessBlock = blockDiff.lastChainBlock
    }
    console.log("----------", blockDiff.lastChainBlock);

    await syncPendingDeposits(ctx)
    await syncLastDeposits(ctx, blockDiff.lastProcessedBlock, maxProcessBlock)
    info('Last processed block updated to %o.', maxProcessBlock)
  } else {
    info('Transactions are in sync at block %o.', blockDiff.lastChainBlock)
  }

  await ctx.Cache.add(blockDiff.cacheKey, maxProcessBlock || blockDiff.lastChainBlock)
  await updateClientStatus(ctx)
}

export async function syncLastDeposits(ctx, lastProcessedBlock, maxProcessBlock) {
  const chainTransactions = await ctx.cryptoClient.listTransactionsSinceBlock(lastProcessedBlock, maxProcessBlock)

  info('Found %o transactions to update since block %o.', chainTransactions.length, lastProcessedBlock)

  for (const chainTransaction of chainTransactions) {
    if (await isInterestingTransaction(ctx, chainTransaction)) {
      await saveDeposit(ctx, chainTransaction)
    }
  }
}

export async function syncPendingDeposits(ctx) {
  info('Syncing pending transactions...')

  const filter = { currency: ctx.cryptoClient.getCurrencies(), amountWasLoaded: false }
  const pendingTransactions = await ctx.Deposits.findAll(filter, { limit: 100 })

  for (const pTransaction of pendingTransactions) {
    const chainTransactionData = await ctx.cryptoClient.findTransaction(pTransaction.txHash, pTransaction)
    // @TODO we need this routine to be more error-resilient for the staging area
    // We need this routine to be more error-resilient for the staging area.
    // Ganache seems to "forget" transactions between restarts, and this would crash the poller
    if (!chainTransactionData) {
      info('Warning: chainTransactionData not found for pendingTransaction: %O', pTransaction)
      continue
    }
    await saveDeposit(ctx, chainTransactionData)
  }
}

export async function calculateBlockDiff(ctx) {
  info('Calculating last block diff...')

  const cacheKey = `${ctx.CURRENCY}_lastBlockCount`
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

export async function updateClientStatus(ctx) {
  info('Updating client status...')
  const stats = await ctx.cryptoClient.clientStatus()

  return ctx.CryptoClientHealth.updateClientStatus(ctx.CURRENCY, stats)
}

async function saveDeposit(ctx, chainTransactionData) {
  info('Updating transaction %o', chainTransactionData.txHash)

  const userUid = chainTransactionData.userUid || await findChainTransactionUser(ctx, chainTransactionData)
  const deposit = await ctx.Deposits.createOrUpdateByUid({
    ...chainTransactionData,
    userUid,
    category: undefined,
  })

  if (deposit.shouldLoadWalletDeposit()) {
    await loadWalletDeposit(ctx, deposit)
  }
}

async function loadWalletDeposit(ctx, deposit) {
  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  const filter = {address: deposit.address, currency: deposit.currency}
  const walletAddress = await ctx.Addresses.find(filter, opts)
  if (walletAddress && walletAddress.wallet) {
    const { wallet } = walletAddress
    await ctx.Wallets.changeBalance(wallet.walletUid, deposit.amount, 'available', opts)
    await ctx.Deposits.setAmountLoaded(deposit.metaUid, opts)
    await ctx.cryptoClient.moveBalanceToBank(walletAddress.address, walletAddress)
    await opts.transaction.commit()
    info('Loaded wallet amount of %o %o for transaction %o', deposit.amount, deposit.currency, deposit.txHash)
    const updatedWallet = await ctx.Wallets.findByUid(wallet.walletUid)
    ctx.Deposits.updateBalanceInfo(ctx.converter, deposit, updatedWallet)
  } else {
    // Commit and free db connection, even if nothing changed.
    await opts.transaction.commit()
  }
}

// Verify if a transaction belongs to our chain "wallet"
async function isInterestingTransaction(ctx, chainTransaction) {
  if (chainTransaction.category === 'deposit') {
    // Find a potential deposit address

    const filter = { address: chainTransaction.address, currency: chainTransaction.currency }
    const walletAddress = await ctx.Addresses.find(filter)
    if (walletAddress) {
      return true
    }
  }

  return false
}

async function findChainTransactionUser(ctx, chainTransaction) {
  // Trying to find a userUid for the transaction
  // either from the wallet address or from a confirmed payment.
  let userUid = chainTransaction.userUid
  if(!userUid) {
    if (chainTransaction.category === 'deposit') {
      const filter = {address: chainTransaction.address, currency: chainTransaction.currency}
      const walletAddress = await ctx.Addresses.find(filter)
      userUid = walletAddress ? walletAddress.userUid : undefined
    } else if (chainTransaction.category === 'withdrawal') {
      const payment = await ctx.Payments.findByTxHash(chainTransaction.txHash)
      userUid = payment ? payment.userUid : undefined
    }
  }

  return userUid
}
