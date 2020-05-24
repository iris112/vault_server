import should from 'should'
import TestApp from '../../app'

describe('Payments', async() => {

  describe('finalAmount', function () {

    it('calculates the final pay amount without fee', async () => {
      const app = new TestApp()
      const payment = await app.Payments.create({
        userUid: '5ea4fa9a-d436-411a-be07-418cc1eec2e3',
        currency: 'ltc',
        address: 'withdraw-address',
        amount: 100000000,
        fee: 1000000,
      })

      should(payment.toJSON().finalAmount).eql(99000000)
    })

  })

})
