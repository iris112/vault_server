import debug from 'debug'
import { transaction } from 'objection'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:changeBalance')

const ACTION_TYPES = [
  'lockBalance', 'unlockBalance',
]

// TODO: Unit test
export default function changeBalance(actionType) {
  console.assert(ACTION_TYPES.includes(actionType), `Unknown action type ${actionType}!`)

  return async function changeBalance(ctx, next) {
    const { userUid, currency, amount } = ctx.request.body

    let wallet = await ctx.Wallets.findByUser(userUid, currency)
    if (!wallet) {
      ctx.body = {error: {statusCode: 404, code: 'walletNotFound'}}
      ctx.status = 404

      return
    }

    const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
    try {
      await ctx.Wallets[actionType](wallet.walletUid, amount, opts)
    } catch (err) {
      console.error(err)

      ctx.body = {error: {statusCode: 409, code: 'amountMismatch'}}
      ctx.status = 409

      await opts.transaction.rollback()
      return
    }

    wallet = await ctx.Wallets.findByUser(userUid, currency, opts)
    await opts.transaction.commit()

    ctx.body = { result: { wallet } }

    await next()
  }
}

changeBalance.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
    amount: Joi.number().integer().min(0),
  }),
}
