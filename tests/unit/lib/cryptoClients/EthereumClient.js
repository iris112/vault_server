import debug from 'debug'
import should from 'should'
import TestApp from '../../../app'
import { skipUnlessCurrencyDefined } from '../../../helpers'

const info = debug('CCVault:EthereumClient')

describe('EthereumClient', async() => {
  const currency = 'eth'

  beforeEach(skipUnlessCurrencyDefined(currency))

  describe('generate address', async() => {

    it('generates an public key using the default password from config', async () => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)

      // create a new empty address
      const newAddress = await client.generateAddress()
      should.exist(newAddress)
      should.exist(newAddress.public)
      should.not.exist(newAddress.private)
      should.equal(newAddress.public.length, 42)
      should.ok(client.isAddress(newAddress.public))
    })

    it('generates a public/private pair key', async () => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)

      // create a new empty address
      const newAddress = await client.generateAddress(true)
      should.exist(newAddress)
      should.exist(newAddress.public)
      should.exist(newAddress.private)
      should.equal(newAddress.public.length, 42)
      should.equal(newAddress.private.length, 66)
      should.ok(client.isAddress(newAddress.public))
    })

  })
  describe('send Ethereum', async () => {

    it('sends ether from bank to a new address and then sends it back to bank', async () => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 0.01

      should(await client.getBalance(client.getBankAddress())).be.aboveOrEqual(amount)

      // create a new empty address
      const emptyAddress = (await client.generateAddress()).public

      let balance = await client.getBalance(emptyAddress)
      should.equal(balance, 0, "Balance should equal 0")

      // send 0.1 eth from bank to it
      let txHash = await client.sendToAddress(emptyAddress, amount)
      await client.waitForTransactionConfirmation(txHash)

      balance = await client.getBalance(emptyAddress)
      should.equal(balance, client.etherToWei(amount))

      // move its balance back to bank
      txHash = await client.moveBalanceToBank(emptyAddress)
      await client.waitForTransactionConfirmation(txHash)

      // check its balance
      balance = await client.getBalance(emptyAddress)
      should.equal(balance, 0, "Balance should equal 0")
    }).timeout(360 * 1000)

  })

})
