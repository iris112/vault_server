import debug from 'debug'
import { transaction } from 'objection'
import { pick } from 'lodash'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:createMarketAccount')

export default createMarketAccount
async function createMarketAccount(ctx, next) {
  const { currency } = ctx.request.body

  const opts = { transaction: await transaction.start(ctx.knex) }
  try {
    const cryptoClient = await ctx.CryptoClientSettings.getClient(currency)
    const cryptoAddress = await cryptoClient.generateAddress()
    await ctx.MarketAccounts.create({
      currency,
      address: cryptoAddress.public,
    }, opts)
    const marketAccount = await ctx.MarketAccounts.findByAddress(cryptoAddress.public, opts)

    await opts.transaction.commit()

    ctx.body = { result: { marketAccount } }
  } catch (err) {
    console.error(err)

    ctx.body = { error: { statusCode: 500, code: 'marketAccountCreateError' } }
    ctx.status = 500

    await opts.transaction.rollback(err)

    return
  }

  await next()
}

createMarketAccount.schema = {
  body: Joi.object().keys({
    currency: Joi.string(),
  }),
}

createMarketAccount.publicViews = {
  details: async (ctx, next) => {
    ctx.body.result.marketAccount = pick(ctx.body.result.marketAccount, [
      'currency', 'address', 'balance', 'createdAt', 'updatedAt',
    ])

    await next()
  },
}
