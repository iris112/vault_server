import should from 'should'
import TestApp from '../../../app'
import createMarketAccount from '../../../../src/handlers/market/createMarketAccount'

describe('createMarketAccount', () => {
  const currency = 'btc'

  it('creates an user account', async () => {
    const app = new TestApp()
    app.CryptoClientSettings = {
      getClient: async ()=> {
        return {
          generateAddress: async ()=> {
            return { public: 'test-address' }
          }
        }
      }
    }
    app.request.body = {
      currency,
    }

    await createMarketAccount(app, app.mockNext)

    should(app.body.result.marketAccount).containEql({
      currency,
      address: 'test-address',
      balance: 0,
    })
  })

})
