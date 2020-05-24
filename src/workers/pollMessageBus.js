import debug from 'debug'

const info = debug('CCVault:pollMessageBus')

// TODO: Unit test
export default pollMessageBus
async function pollMessageBus(ctx, next) {
  info('Polling messageBus...')
  let pollMessages = true

  while (pollMessages) {
    const message = await ctx.cceEngine.receiveMessage()
    if (message) {
      info('Processing new message %o', message)
      await ctx.knex.transaction(async function (transaction) {

        const messageBody = ctx.cceEngine.parseQMessage(message.Body)
        await processMessage(ctx, messageBody, { transaction })

        info('Message processed.')
        try {
          await ctx.cceEngine.deleteMessage(message)
          info('Message deleted.')
          await transaction.commit()
        } catch (err) {
          info('Error deleting message %o', err)
          await transaction.rollback()
          throw err
        }

      })
    }
  }

  return Promise.resolve('Stopped polling messages.')
}

// TODO: Log orderMatches and walletUpdates
// TODO: Unit test
export async function processMessage(ctx, messageBody, opts) {
  let walletUpdates = []
  if (messageBody.orderMatches) {
    for (const orderMatch of messageBody.orderMatches) {
      walletUpdates = walletUpdates.concat([ ...orderMatch.walletUpdates ])
    }
  }
  if (messageBody.walletUpdates) {
    walletUpdates = walletUpdates.concat([ ...messageBody.walletUpdates ])
  }
  if (walletUpdates.length > 0) {
    await updateWallets(ctx, walletUpdates, opts)
  }
}

async function updateWallets(ctx, walletUpdates, opts) {
  for (const walletUpdate of walletUpdates) {
    info('Updating wallet balance for %o', walletUpdate)

    const { userUid, currency, balanceType } = walletUpdate
    let wallet = await ctx.Wallets.findByUser(userUid, currency, opts)
    if (!wallet) {
      wallet = await ctx.Wallets.create({ userUid, currency }, opts)
    }
    const amount = walletUpdate.operation === '-' ? walletUpdate.amount * -1 : walletUpdate.amount
    await ctx.Wallets.changeBalance(wallet.walletUid, amount, balanceType, opts)

    info('Updated wallet balance for %o: %o', wallet.walletUid, walletUpdate)
  }
}
