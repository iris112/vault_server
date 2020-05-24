import should from 'should'
import TestApp from '../../app'
import { syncPayments } from '../../../src/workers/pollBinanceWithdrawals'

describe('pollBinanceWithdrawals', async() => {
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
  const currency = 'eth'
  const address = '﻿1BcHAekvN2SwEq9FpDjcRYKMBZ1nMvxhxx'

  describe('syncPayments', function () {
    it('updates payment status from Binance withdrawals', async () => {
      const app = new TestApp()
      await app.Wallets.create({ userUid, currency, lockedBalance: 100000000 })
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency, address,
      })
      await app.Payments.create({
        userUid, currency, amount: 30000000, address,
        binanceId: '7213fea8e94b4a5593d507237e5a555b',
      })
      await app.Payments.create({
        userUid, currency, amount: 70000000, address,
        binanceId: '4213fea8e94b4a5593d507237e5a111c',
      })

      await syncPayments(app)
      const updatedUserWallet = await app.Wallets.findByUser(userUid, currency)
      const canceledPayment = await app.Payments.findByBinanceId('7213fea8e94b4a5593d507237e5a555b')
      const paidPayment = await app.Payments.findByBinanceId('4213fea8e94b4a5593d507237e5a111c')

      should(updatedUserWallet).containEql({
        availableBalance: 30000000,
        lockedBalance: 0,
      })
      should(canceledPayment).containEql({
        status: 'canceled',
      })
      should(paidPayment).containEql({
        status: 'paid',
        txHash: '0xdf33b22bdb2b28b1f75ccd201a4a4m6e7g83jy5fc5d5a9d1340961598cfcb0a1',
      })
    })
  })

})
