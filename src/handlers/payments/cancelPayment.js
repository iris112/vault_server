import debug from 'debug'
import { transaction } from 'objection'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:cancelPayment')

// TODO: Unit test
export default cancelPayment
async function cancelPayment(ctx, next) {
  const { userUid, currency, paymentUid } = ctx.request.body
  const cryptoClient = await ctx.CryptoClientSettings.getClient(currency)

  if (cryptoClient.config.liquidityProvider === 'binance') {
    ctx.body = { error: { statusCode: 409, code: 'binancePaymentNotCancelable' } }
    ctx.status = 409

    return
  }

  let wallet
  let payment
  // Lock tables
  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  try {
    payment = await ctx.Payments.findByUid(paymentUid, opts)
    if (!payment) {
      ctx.body = { error: { statusCode: 404, code: 'paymentNotFound' } }
      ctx.status = 404

      await opts.transaction.rollback()
      return
    }

    if (payment.userUid !== userUid || payment.currency !== currency || payment.status !== 'pending') {
      ctx.body = {
        error: {
          statusCode: 409,
          code: 'unexpectedPaymentData',
          data: { userUid, currency, status: payment.status }
        }
      }
      ctx.status = 409

      await opts.transaction.rollback()
      return
    }

    wallet = await ctx.Wallets.findByUser(userUid, currency, opts)
    if (!wallet) {
      ctx.body = { error: { statusCode: 404, code: 'walletNotFound' } }
      ctx.status = 404

      await opts.transaction.rollback()
      return
    }

    try {
      await ctx.Wallets.unlockBalance(wallet.walletUid, payment.amount, opts)
    } catch (err) {
      console.error(err)

      ctx.body = { error: { statusCode: 409, code: 'amountMismatch' } }
      ctx.status = 409

      await opts.transaction.rollback()
      return
    }

    try {
      const paymentData = { status: 'canceled' }
      await ctx.Payments.update(paymentUid, paymentData, opts)

      info('Canceled %o payment for %o.', currency, payment.paymentUid)
    } catch (err) {
      console.error(err)

      ctx.body = { error: { statusCode: 500, code: 'cancelPayment' } }
      ctx.status = 500

      await opts.transaction.rollback()
      return
    }

    wallet = await ctx.Wallets.findByUser(userUid, currency, opts)
    payment = await ctx.Payments.findByUid(paymentUid, opts)

    await opts.transaction.commit()

    await ctx.Payments.updateBalanceInfo(ctx.converter, payment, wallet)

    ctx.body = { result: { payment, wallet } }
  } catch (err) {
    return
  }

  await next()
}

cancelPayment.schema = {
  body: Joi.object().keys({
    paymentUid: Joi.string().uuid(),
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
  }),
}
