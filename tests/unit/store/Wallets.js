import { Big }  from '@cc-dev/math'
import { expect } from 'chai'
import TestApp from '../../app'

describe('Wallets', async() => {

  describe('change balance', async() => {

    it('try to spend more than you have', async () => {

      const app = new TestApp()
      const wallet = await app.Wallets.create({
        walletUid: 'ef2c41ef-4d51-4cc4-8997-5e3cbdcc9aa0',
        userUid: '439c9912-47a7-11e8-842f-0ed5f89f718b',
        projectId: '439c9912-47a7-11e8-842f-0ed5f89f718b',
        currency: 'eth',
        availableBalance: 10,
        lockedBalance: 0,
      })

      // add
      await (async () => app.Wallets.changeBalance(wallet.walletUid, 5, 'available').should.eventually.not.throw())()

      // valid
      await (async () => app.Wallets.changeBalance(wallet.walletUid, -2, 'available'))()

      // remove more
      app.Wallets.changeBalance(wallet.walletUid, -50, 'available').should.eventually.throw()

    })

  })

})