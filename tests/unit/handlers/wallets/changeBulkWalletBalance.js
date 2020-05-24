import should from 'should'
import TestApp from '../../../app'
import changeBulkWalletBalance from '../../../../src/handlers/wallets/changeBulkWalletBalance'

describe('changeBulkWalletBalance', () => {
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
  const userUid2 = '5ea4fa9a-d436-411a-be07-418cc1eec2e2'
  const currency = 'btc'
  const currency2 = 'wow-sword'

  it('changes balance for multiple wallets', async () => {
    const app = new TestApp()
    await app.Wallets.create({ userUid, currency, availableBalance: 100000000 })
    await app.Wallets.create({ userUid: userUid2, currency: currency2, lockedBalance: 100000000 })
    app.request.body = {
      transfers: [
        { userUid, currency, amount: -50000000, balanceType: 'available' },
        { userUid: userUid2, currency, amount: 50000000, balanceType: 'available' },
        { userUid: userUid2, currency: currency2, amount: -100000000, balanceType: 'locked' },
        { userUid: userUid, currency: currency2, amount: 100000000, balanceType: 'available' },
      ]
    }

    await changeBulkWalletBalance(app, app.mockNext)

    should.exists(app.body.result)
    should(app.body.result.wallets[0]).containEql({
      userUid, currency, lockedBalance: 0, availableBalance: 50000000,
    })
    should(app.body.result.wallets[1]).containEql({
      userUid: userUid2, currency, lockedBalance: 0, availableBalance: 50000000,
    })
    should(app.body.result.wallets[2]).containEql({
      userUid: userUid2, currency: currency2, lockedBalance: 0, availableBalance: 0,
    })
    should(app.body.result.wallets[3]).containEql({
      userUid: userUid, currency: currency2, lockedBalance: 0, availableBalance: 100000000,
    })
  })

})
