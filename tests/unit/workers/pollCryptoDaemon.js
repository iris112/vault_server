import should from 'should'
import TestApp from '../../app'
import {
  syncLastDeposits, syncPendingDeposits,
  calculateBlockDiff, updateClientStatus
} from '../../../src/workers/pollCryptoDaemon'

// ref: https://rinkeby.etherscan.io/tx/0x0f4ade32c310283a802364a7a2dfc7f34eaa2306c1ec3385c891527ba2a8ad6c
describe.skip('pollCryptoDaemon', async() => {
  const LAST_CHAIN_BLOCK = 2425833
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
  const currency = 'eth'
  const address = '0x2b3f2afd025006a05222812286e4c7ef0f6ea4c7'
  const txHash = '0x0f4ade32c310283a802364a7a2dfc7f34eaa2306c1ec3385c891527ba2a8ad6c'
  const txBlock = 2425834
  const metaUid = '40bb00f086714af052fe423b141778886f21d766ba4d894e3f47218d6f8d100e'

  describe('syncLastDeposits', function () {

    it('confirms incoming deposits', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
      app.cryptoClient.config.minConfirmations = 1
      app.cryptoClient.countBlocks = async ()=> LAST_CHAIN_BLOCK+2
      await app.Wallets.create({ userUid, currency })
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency, address,
      })

      await syncLastDeposits(app, LAST_CHAIN_BLOCK, LAST_CHAIN_BLOCK+2)
      const deposits = await app.Deposits.findAll({ currency })
      const wallet = await app.Wallets.findByUid(userWallet.walletUid)

      should(deposits.length).eql(1)
      should(deposits[0]).containEql({
        confirmations: 1,
        amount: 101000,
        amountWasLoaded: 1,
        txHash,
        userUid,
        address: '0x2b3f2AFD025006A05222812286e4c7EF0f6EA4C7',
        status: 'confirmed',
      })
      should(wallet).containEql({
        availableBalance: 101000,
        lockedBalance: 0,
      })
    })

    it('sets incoming deposits as pending', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
      app.cryptoClient.config.minConfirmations = 2
      app.cryptoClient.countBlocks = async ()=> LAST_CHAIN_BLOCK+2
      await app.Wallets.create({ userUid, currency })
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency, address,
      })

      await syncLastDeposits(app, LAST_CHAIN_BLOCK, LAST_CHAIN_BLOCK+2)
      const deposits = await app.Deposits.findAll({ currency })
      const wallet = await app.Wallets.findByUid(userWallet.walletUid)

      should(deposits.length).eql(1)
      should(deposits[0]).containEql({
        confirmations: 1,
        amount: 101000,
        amountWasLoaded: 0,
        txHash,
        userUid,
        address: '0x2b3f2AFD025006A05222812286e4c7EF0f6EA4C7',
        status: 'pending',
      })
      should(wallet).containEql({
        availableBalance: 0,
        lockedBalance: 0,
      })
    })
  })

  describe('syncPendingDeposits', function () {
    it('loads pending wallet deposits', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
      app.cryptoClient.config.minConfirmations = 3
      await app.Wallets.create({ userUid, currency })
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency, address,
      })
      await app.Deposits.create({
        metaUid,
        userUid: '5ea4fa9a-d436-411a-be07-418cc1eec2e3',
        txHash,
        txBlock,
        currency: app.CURRENCY,
        address,
        amount: 101000,
        confirmations: 1,
        amountWasLoaded: false,
        status: 'pending',
        updatedAt: 1528561981181,
        createdAt: 1528457589000,
      })

      await syncPendingDeposits(app)
      const deposit = await app.Deposits.findByUid(metaUid)
      const wallet = await app.Wallets.findByUid(userWallet.walletUid)

      should.exist(deposit)
      should(deposit).containEql({
        amount: 101000,
        amountWasLoaded: 1,
        txHash,
        userUid,
        address: '0x2b3f2AFD025006A05222812286e4c7EF0f6EA4C7',
        status: 'confirmed',
      })
      should(wallet).containEql({
        availableBalance: 101000,
        lockedBalance: 0,
      })
    })
  })

  describe('calculateBlockDiff', function () {
    it('returns the amount of blocks remaining to be processed', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)

      const blockDiff = await calculateBlockDiff(app)

      should.exist(blockDiff)
      should(blockDiff.lastChainBlock).greaterThan(0)
      should(blockDiff.lastProcessedBlock).greaterThan(0)
      should(blockDiff).containEql({
        cacheKey: `${app.CURRENCY}_lastBlockCount`,
        inSync: blockDiff.lastProcessedBlock === blockDiff.lastChainBlock,
      })
    })
  })

  describe('updateClientStatus', function () {
    it('updates the client last check time and block info', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)

      await updateClientStatus(app)
      const clientHealth = await app.CryptoClientHealth.findOne(currency)

      should.exist(clientHealth)
      should(Object.keys(clientHealth).sort()).eql([
        'currency', 'clientStatus', 'connections',
        'lastBlockTime', 'lastChecked', 'blockHeight',
      ].sort())
    })
  })

})
