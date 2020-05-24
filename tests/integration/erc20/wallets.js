import should from 'should'
import TestApp from '../../app'
import { skipUnlessCurrencyDefined } from '../../helpers'
import { seedERC20Token } from '../../mocks'

import createWallet from '../../../src/handlers/wallets/createWallet'
import listWallets from '../../../src/handlers/wallets/listWallets'
import getWallet from '../../../src/handlers/wallets/getWallet'

describe('ERC20 Token wallets', async() => {
  const currency = 'tst'
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'

  beforeEach(skipUnlessCurrencyDefined('eth'))
  beforeEach(async () => await seedERC20Token(new TestApp()))

  it('returns no wallets', async () => {
    const app = new TestApp()
    app.request.body = {
      currency, userUid
    }

    await listWallets(app, app.mockNext)

    should(app.body.result).containEql({
      wallets: [],
      total: 0,
    })
  })

  describe('with a created wallet', async () => {
    beforeEach(async function() {
      const app = new TestApp()
      app.request.body = {
        currency, userUid
      }

      await createWallet(app, app.mockNext)

      this.wallet = app.body.result.wallet;
    })

    it('returns the wallet on a wallet list', async function() {
      const app = new TestApp()
      app.request.body = {
        currency, userUid
      }

      await listWallets(app, app.mockNext)

      should(app.body.result).containEql({
        wallets: [this.wallet],
        total: 1,
      })
    })

    it('returns information about the wallet', async function() {
      const app = new TestApp()
      app.request.body = {
        currency, userUid
      }

      await getWallet(app, app.mockNext)

      should(app.body.result).containEql({
        wallet: this.wallet
      })
    })
  })
})
