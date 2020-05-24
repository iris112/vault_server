import debug from 'debug'
import should from 'should'
import sleep from 'await-sleep'
import { Numbers } from '@cc-dev/math'
import TestApp from '../../app'
import { syncDaemon } from '../../../src/workers/pollCryptoDaemon'
import { waitUntil, skipUnlessCurrencyDefined, causeEthBlockMined } from '../../helpers'


const info = debug('CCVault:integrations')

describe('syncDaemon', async() => {

  describe('syncEth', function () {
    const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
    const currency = 'eth'

    beforeEach(skipUnlessCurrencyDefined(currency))

    it('syncs transactions from new blocks', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
      app.cryptoClient.config.minConfirmations = 1
      const amountToSend = 0.05

      const { public: address } = await app.cryptoClient.generateAddress()

      info(`created new empty account: pub key ${address}`)

      await app.Wallets.create({userUid, currency})
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency,
        address,
      })

      await syncDaemon(app)
      const initialBlock = await app.cryptoClient.countBlocks()

      const txHash = await app.cryptoClient.sendToAddress(address, amountToSend)
      await app.cryptoClient.waitForTransactionConfirmation(txHash)

      let balance = await app.cryptoClient.getBalance(address)
      should(balance).equal(await app.cryptoClient.etherToWei(amountToSend))

      await syncDaemon(app)

      const deposit = await app.Deposits.findByTxHash(txHash)
      should.exist(deposit)

      should(deposit).containEql({
        txHash,
        userUid,
        amount: Numbers.toBigInt(amountToSend),
      })

      waitUntil(async() => {
        causeEthBlockMined(app.cryptoClient)
        await syncDaemon(app)
        return await app.Deposits.findByTxHash(txHash)
      }, (deposit) => deposit && deposit.status == 'confirmed', 60)

      // We move tokens to the bank
      balance = await waitUntil(() => app.cryptoClient.getBalance(address),
                                (balance) => balance == 0, 120)
      should.equal(balance, 0, "Balance should equal 0")
    }).timeout(220 * 1000)

  })

  describe.skip('syncEtc', function () {
    const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
    const currency = 'etc'
    const address = '0x237f3462CC24dFfDe246B510460C55FB58669137'

    it('syncs transactions from new blocks', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
      app.cryptoClient.config.minConfirmations = 1
      await app.Wallets.create({userUid, currency})
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency, address,
      })
      const initialChainBalance = Numbers.toBigInt(await app.cryptoClient.getBalance(address))
      const receipt = await app.cryptoClient.sendEthereum(
        '0x0C7C81175C79fEa43dE333b99b6Ccd9Ebb5730e2',                         // from
        '0xb3f96bf5197d7a3e0ee5bf94b66f36cd2ea1b9989de234116ee2102f99dce81d', // pv key
        address,                         // to
        '0.0001'                                                              // amount
      )
      const finalChainBalance = Numbers.toBigInt(await app.cryptoClient.getBalance(address))
      await app.Cache.add(`${currency}_lastBlockCount`, receipt.blockNumber - 1)

      await syncDaemon(app)
      const deposit = await app.Deposits.findByTxHash(receipt.transactionHash)

      should.exist(deposit)
      should(deposit).containEql({
        txHash: receipt.transactionHash,
        userUid,
        amount: finalChainBalance - initialChainBalance,
      })
    }).timeout(60000)

  })

  describe.skip('syncBtc', function () {
    const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'
    const currency = 'btc'

    it('syncs transactions from new blocks', async () => {
      const app = new TestApp()
      app.CURRENCY = currency
      app.CryptoClientSettings.findOne = async ()=> {
        return {
          currency: 'btc',
          client: {
            host: 'localhost',
            network: 'regtest',
            username: 'test',
            password: 'test',
            port: 18443,
          },
          minConfirmations: 8,
        }
      }
      app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
      await app.Wallets.create({userUid, currency})
      const userWallet = await app.Wallets.findByUser(userUid, currency)
      const { public:address } = await app.cryptoClient.generateAddress()
      await app.Addresses.create({
        walletId: userWallet.walletId,
        userUid, currency, address,
      })
      await app.cryptoClient.client.generate(101)
      const txHash = await app.cryptoClient.sendToAddress(address, 0.5)
      await app.Cache.add(`${currency}_lastBlockCount`, 100)
      await app.cryptoClient.client.generate(app.cryptoClient.config.minConfirmations)

      await syncDaemon(app)
      const deposit = await app.Deposits.findByTxHash(txHash)

      should.exist(deposit)
      should(deposit).containEql({
        txHash,
        userUid,
        amount: Numbers.toBigInt(0.5),
        status: 'confirmed',
        amountWasLoaded: 1,
      })
    }).timeout(60000)

  })

})
