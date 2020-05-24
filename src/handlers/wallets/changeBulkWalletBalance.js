import debug from 'debug'
import { Joi } from '@cc-dev/validator'
import { transaction } from 'objection'
import * as constants from '../../constants'

const info = debug('CCVault:changeBulkWalletBalance')

export default changeBulkWalletBalance
async function changeBulkWalletBalance(ctx, next) {
  const { transfers } = { ...ctx.request.body }

  const wallets = []
  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  for (const transfer of transfers) {
    let wallet = await ctx.Wallets.findByUser(transfer.userUid, transfer.currency, opts)
    if (!wallet) {
      await ctx.Wallets.create({ userUid: transfer.userUid, currency: transfer.currency }, opts)
      wallet = await ctx.Wallets.findByUser(transfer.userUid, transfer.currency, opts)
    }
    try {
      await ctx.Wallets.changeBalance(wallet.walletUid, transfer.amount, transfer.balanceType, opts)
      wallet = await ctx.Wallets.findByUser(transfer.userUid, transfer.currency, opts)
    } catch (err) {
      console.error(err)

      ctx.body = {error: {statusCode: 409, code: 'walletTransferAmountMismatch'}}
      ctx.status = 409

      await opts.transaction.rollback()
      return
    }
    wallets.push(wallet)
  }
  await opts.transaction.commit()

  ctx.body = {
    result: {
      wallets,
    },
  }

  await next()
}

changeBulkWalletBalance.schema = {
  body: Joi.object().keys({
    transfers: Joi.array().items(Joi.object().keys({
      userUid: Joi.string().uuid(),
      currency: Joi.string(),
      amount: Joi.number().integer(),
      balanceType: Joi.any().valid(constants.BALANCE_TYPES),
    })).min(1).max(10)
  }),
}
