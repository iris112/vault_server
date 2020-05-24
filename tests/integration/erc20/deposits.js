import debug from 'debug'
import should from 'should'
import TestApp from '../../app'
import { Numbers } from '@cc-dev/math'
import { waitUntil, skipUnlessCurrencyDefined, causeEthBlockMined } from '../../helpers'
import { seedERC20Token } from '../../mocks'
import { syncDaemon } from '../../../src/workers/pollCryptoDaemon'

const info = debug('CCVault:ERC20:integrations')

describe('ERC20 Token deposits', async() => {
  const currency = 'erc20'
  const tokenCurrency = 'tst'
  const userUid = '5ea4fa9a-d436-411a-be07-418cc1eec2e3'

  beforeEach(skipUnlessCurrencyDefined('eth'))
  beforeEach(async () => await seedERC20Token(new TestApp()))

  it('syncs deposits for tokens', async () => {
    const app = new TestApp()
    app.CURRENCY = currency
    app.cryptoClient = await app.CryptoClientSettings.getClient(app.CURRENCY)
    const tstClient = await app.CryptoClientSettings.getClient(tokenCurrency)
    const amountToSend = Numbers.toBigInt(0.005)

    const { public: address } = await tstClient.generateAddress()

    info(`created new empty account: pub key ${address}`)

    await app.Wallets.create({userUid, currency: tokenCurrency})
    const userWallet = await app.Wallets.findByUser(userUid, tokenCurrency)
    await app.Addresses.create({
      walletId: userWallet.walletId,
      currency: tokenCurrency,
      userUid, address,
    })

    // initial sync
    await syncDaemon(app)
    const initialBlock = await app.cryptoClient.countBlocks()

    const txHash = await tstClient.sendToAddress(address, amountToSend)
    await tstClient.waitForTransactionConfirmation(txHash)

    let balance = await tstClient.getBalance(address)
    should(balance).equal((await tstClient.integerToAbsolute(amountToSend)).toString())

    await syncDaemon(app)

    const deposit = await app.Deposits.findByTxHash(txHash)

    should.exist(deposit)
    should(deposit).containEql({
      txHash,
      userUid,
      amount: Numbers.toBigInt(amountToSend),
    })

    waitUntil(async() => {
      causeEthBlockMined(tstClient)
      await syncDaemon(app)
      return await app.Deposits.findByTxHash(txHash)
    }, (deposit) => deposit && deposit.status == 'confirmed', 60)

    // We move tokens to the bank
    balance = await waitUntil(() => tstClient.getBalance(address),
                              (balance) => balance == 0, 60)
    should.equal(balance, 0, "Balance should equal 0")
  }).timeout(220 * 1000)
})
