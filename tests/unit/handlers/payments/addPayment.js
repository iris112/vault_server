import should from 'should'
import TestApp from '../../../app'
import addPayment from '../../../../src/handlers/payments/addPayment'

describe('addPayment', () => {
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
  const address = '﻿1BcHAekvN2SwEq9FpDjcRYKMBZ1nMvxhxx'

  it('adds user payment', async () => {
    const currency = 'btc'
    const app = new TestApp()
    await app.Wallets.create({ userUid, currency, availableBalance: 100000000 })
    const userWallet = await app.Wallets.findByUser(userUid, currency)
    app.request.body = {
      userUid, currency, address,
      amount: 100000000,
    }

    await addPayment(app, app.mockNext)

    should(app.body.result.payment).containEql({
      userUid, address, currency,
      amount: 100000000,
    })
    should(app.body.result.payment).not.have.key('binanceId')
    should(app.body.result.wallet).containEql({
      userUid, currency,
      availableBalance: 0,
      lockedBalance: 100000000,
    })
  })

  it('withdraws binance if there is such option', async () => {
    const currency = 'eth'
    const app = new TestApp()
    await app.Wallets.create({ userUid, currency, availableBalance: 100000000 })
    const userWallet = await app.Wallets.findByUser(userUid, currency)
    app.request.body = {
      userUid, currency, address,
      amount: 100000000,
    }

    await addPayment(app, app.mockNext)

    should(app.body.result.payment).containEql({
      binanceId: 'random-binanceId'
    })

  })

})
