import should from 'should'
import TestApp from '../../app'
import { skipUnlessCurrencyDefined } from '../../helpers'
import { seedERC20Token } from '../../mocks'
import { Numbers } from '@cc-dev/math'

import addPayment from '../../../src/handlers/payments/addPayment'
import pay from '../../../src/handlers/payments/pay'

describe('ERC20 Token payments', async() => {
  const currency = 'tst'
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'

  beforeEach(skipUnlessCurrencyDefined('eth'))
  beforeEach(async () => await seedERC20Token(new TestApp()))

  it('adds user payment', async () => {
    const app = new TestApp()

    const client = await app.CryptoClientSettings.getClient(currency)
    const recipient = (await client.generateAddress()).public
    const amount = Numbers.toBigInt(0.01)

    await app.Wallets.create({ userUid, currency, availableBalance: amount })
    const userWallet = await app.Wallets.findByUser(userUid, currency)

    app.request.body = {
      userUid, currency,
      address: recipient,
      amount,
    }

    await addPayment(app, app.mockNext)

    should(app.body.error).be.undefined()

    should(app.body.result.payment).containEql({
      userUid, currency,
      address: recipient,
      amount: amount,
    })
    should(app.body.result.payment).not.have.key('binanceId')
    should(app.body.result.wallet).containEql({
      userUid, currency,
      availableBalance: 0,
      lockedBalance: amount,
    })
  })

  it('completes a payment', async () => {
    const app = new TestApp()

    const client = await app.CryptoClientSettings.getClient(currency)
    const recipient = (await client.generateAddress()).public
    const amount = Numbers.toBigInt(0.01)

    await app.Wallets.create({ userUid, currency, availableBalance: amount })
    const userWallet = await app.Wallets.findByUser(userUid, currency)

    app.request.body = {
      userUid, currency,
      address: recipient,
      amount,
    }

    await addPayment(app, app.mockNext)
    should(app.body.error).be.undefined()

    const paymentUid = app.body.result.payment.paymentUid

    app.request.body = {
      userUid, currency, paymentUid
    }

    await pay(app, app.mockNext)
    should(app.body.error).be.undefined()

    should(app.body.result.payment).containEql({
      status: 'paid'
    })
    should(app.body.result.wallet).containEql({
      userUid, currency,
      availableBalance: 0,
      lockedBalance: 0,
    })

    await client.waitForTransactionConfirmation(app.body.result.payment.txHash)
    const balance = await client.getBalance(recipient)
    should.equal(balance, await client.integerToAbsolute(0.005)) // minus fee
  }).timeout(360 * 1000)

})
