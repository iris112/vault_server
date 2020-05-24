import should from 'should'
import TestApp from '../../../app'
import createWalletWithBalance from '../../../../src/handlers/wallets/createWalletWithBalance'

describe('createWalletWithBalance', () => {
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
  const currency = 'test-currency'

  it('creates an wallet with initial availableBalance', async () => {
    const app = new TestApp()
    app.request.body = {
      userUid, currency,
      availableBalance: 100000000,
    }

    await createWalletWithBalance(app, app.mockNext)

    should(app.body.result.wallet).containEql({
      userUid, currency,
      availableBalance: 100000000,
      lockedBalance: 0,
    })
  })

})
