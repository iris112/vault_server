import debug from 'debug'
import sleep from 'await-sleep'
import {transaction} from 'objection'
import { Binance } from '@cc-dev/liquidity'

const info = debug('CCVault:pollBinanceWithdrawals')

const SLEEP_TIME = 60000 // 1 min mls

export default async function pollBinanceWithdrawals(ctx) {
  let running = true
  while (running) {
    await syncPayments(ctx)
    info('Finished polling withdrawals, waiting for %o mls...', SLEEP_TIME)
    await sleep(SLEEP_TIME)
  }
}

export async function syncPayments(ctx) {
  info('Syncing pending payments...')

  const binanceWithdrawals = await ctx.binance.listWithdrawals()

  for (const withdrawal of binanceWithdrawals) {
    const payment = await ctx.Payments.findByBinanceId(withdrawal.id)
    if (!payment) {
      info(`Payment with binanceId ${withdrawal.id} not found.`)
    } else if (Binance.isPaidWithdrawal(withdrawal) && payment.status !== 'paid') {
      await pay(ctx, withdrawal)
    } else if (Binance.isCanceledWithdrawal(withdrawal) && payment.status !== 'canceled') {
      await cancel(ctx, withdrawal)
    } else {
      info(`Unhandled withdrawal status '${withdrawal.id}' for binanceId ${withdrawal.id}.`)
    }
  }
}

async function pay(ctx, withdrawal) {
  info(`Processing payment for binanceId ${withdrawal.id}...`)

  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  const payment = await ctx.Payments.findByBinanceId(withdrawal.id, opts)

  const wallet = await ctx.Wallets.findByUser(payment.userUid, payment.currency, opts)
  await ctx.Wallets.changeBalance(wallet.walletUid, -payment.amount, 'locked', opts)
  const paymentData = { status: 'paid', txHash: withdrawal.txId }
  await ctx.Payments.update(payment.paymentUid, paymentData, opts)

  await opts.transaction.commit()

  info(`Payment with binanceId ${withdrawal.id} was successfully paid.`)
}

async function cancel(ctx, withdrawal) {
  info(`Cancelling payment for binanceId ${withdrawal.id}...`)

  const opts = { transaction: await transaction.start(ctx.knex), forUpdate: true }
  const payment = await ctx.Payments.findByBinanceId(withdrawal.id, opts)

  const wallet = await ctx.Wallets.findByUser(payment.userUid, payment.currency, opts)
  await ctx.Wallets.unlockBalance(wallet.walletUid, payment.amount, opts)
  const paymentData = { status: 'canceled' }
  await ctx.Payments.update(payment.paymentUid, paymentData, opts)
  await opts.transaction.commit()

  info(`Payment with binanceId ${withdrawal.id} was canceled.`)
}
