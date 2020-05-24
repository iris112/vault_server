import debug from 'debug'
import { transaction } from 'objection'
import { Joi } from '@cc-dev/validator'
import * as constants from '../../constants'

const info = debug('CCVault:createWallet')

// TODO: Unit test
export default createWallet
async function createWallet(ctx, next) {
  const { userUid, currency } = ctx.request.body

  let wallet = await ctx.Wallets.findByUser(userUid, currency)
  if (!wallet) {
    await ctx.Wallets.create({userUid, currency})
    wallet = await ctx.Wallets.findByUser(userUid, currency)
  }

  // Rely on MySQL table lock (forUpdate) to avoid spamming the crypto client
  // with lots of address generate
  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  try {
    const counters = await ctx.Addresses.countAll({ currency, userUid }, opts)

    if (counters[0].total < constants.WALLET_ADDRESS_LIMIT) {
      const cryptoClient = await ctx.CryptoClientSettings.getClient(currency)
      // TODO: Figure out how to store and return the integrated_address as well
      const cryptoAddress = await cryptoClient.generateAddress()
      const addressData = {
        walletId: wallet.walletId,
        address: cryptoAddress.public,
        privateKey: cryptoAddress.private,
        userUid, currency,
      }
      await ctx.Addresses.create(addressData, opts)
      wallet = await ctx.Wallets.findByUid(wallet.walletUid, opts)
    }

    await opts.transaction.commit()
  } catch (err) {
    console.error(err)

    ctx.body = { error: { statusCode: 500, code: 'cryptoClientConnErr' } }
    ctx.status = 500

    await opts.transaction.rollback(err)

    return
  }

  ctx.body = { result: { wallet } }

  await next()
}

createWallet.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
  }),
}

