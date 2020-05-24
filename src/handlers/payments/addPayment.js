import debug from 'debug'
import { transaction } from 'objection'
import { pick } from 'lodash'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:addPayment')

export default addPayment
async function addPayment(ctx, next) {
  const paymentData = { ...ctx.request.body }
  const { userUid, currency, amount, address } = paymentData

  const currencySettings = await ctx.CurrencySettings.findOne(currency)
  if (!currencySettings || !currencySettings.withdrawalFee) {
    ctx.body = { error: { statusCode: 409, code: 'unknownWithdrawalFee' } }
    ctx.status = 409
    return
  }
  paymentData.fee = currencySettings.withdrawalFee

  let wallet
  let payment
  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  try {
    wallet = await ctx.Wallets.findByUser(userUid, currency, opts)
    if (!wallet) {
      ctx.body = { error: { statusCode: 404, code: 'walletNotFound' } }
      ctx.status = 404

      await opts.transaction.rollback()
      return
    }

    try {
      await ctx.Wallets.lockBalance(wallet.walletUid, amount, opts)
    } catch (err) {
      console.error(err)

      ctx.body = { error: { statusCode: 409, code: 'amountMismatch' } }
      ctx.status = 409

      await opts.transaction.rollback()
      return
    }

    const cryptoClient = await ctx.CryptoClientSettings.getClient(currency)
    if (cryptoClient.config.liquidityProvider === 'binance') {
      try {
        paymentData.binanceId = await ctx.binance.withdraw(currency, address, amount, userUid)
      } catch (err) {
        console.error(err)

        ctx.body = { error: { statusCode: 503, code: 'binanceFailedWithdrawalRequest' } }
        ctx.status = 503

        await opts.transaction.rollback()
        return
      }
    }

    payment = await ctx.Payments.create(paymentData, opts)
    wallet = await ctx.Wallets.findByUser(userUid, currency, opts)

    await opts.transaction.commit()
    await ctx.Payments.updateBalanceInfo(ctx.converter, payment, wallet)

    ctx.body = { result: { payment, wallet } }
  } catch (err) {
    return
  }

  await next()
}

addPayment.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
    amount: Joi.number().integer().positive(),
    address: Joi.string(),
  }),
}

addPayment.publicViews = {
  details: async (ctx, next) => {
    ctx.body.result.payment = pick(ctx.body.result.payment.toJSON(), [
      'paymentUid', 'userUid', 'currency', 'address', 'amount',
      'fee', 'finalAmount', 'txHash', 'status','createdAt', 'updatedAt',
    ])

    await next()
  },
}
