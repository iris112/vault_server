import debug from 'debug'
import should from 'should'
import TestApp from '../../../app'
import { skipUnlessCurrencyDefined } from '../../../helpers'
import { seedERC20Token } from '../../../mocks'
import Web3 from 'web3'

const BN = Web3.utils.BN

const info = debug('CCVault:ERC20Tokens')

describe('ERC20Token', async() => {
  const currency = 'tst'

  beforeEach(skipUnlessCurrencyDefined('eth'))
  beforeEach(async () => await seedERC20Token(new TestApp()))

  describe('generate address', async() => {

    it('generates an ethereum public key', async () => {
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

    it('generates an ethereum public/private pair key', async () => {
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

  describe('balance', async() => {
    it('returns tokens balance, not ETH', async() => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)

      let tstBalance = await client.getBalance(client.getBankAddress());
      let ethBalance = await client.erc20Client.getBankWeiBalance();
      should(tstBalance).be.greaterThan(0)
      should(tstBalance).not.equal(ethBalance)
    })

    it("returns token's precision", async() => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)

      should(await client.getTokenPrecision()).equal(16)
    })

    it("converts integer tokens to absolute", async() => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      client.erc20Client.getTokenDecimals = async() => 5;

      should(BN.isBN(await client.integerToAbsolute(1))).be.true()
      should((await client.integerToAbsolute(1)).toNumber()).equal(100000)
      should((await client.integerToAbsolute(0.01)).toNumber()).equal(1000)
      should((await client.integerToAbsolute(0.03)).toNumber()).equal(3000)

      client.erc20Client.getTokenDecimals = async() => 0;
      should((await client.integerToAbsolute(1)).toNumber()).equal(1)
    })

    it("converts absolute tokens to integer", async() => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      client.erc20Client.getTokenDecimals = async() => 5;

      should(await client.absoluteToInteger(new BN(100000))).equal(1)
      should(await client.absoluteToInteger(100000)).equal(1)
      should(await client.absoluteToInteger(1000)).equal(0.01)
      should(await client.absoluteToInteger(3000)).equal(0.03)

      client.erc20Client.getTokenDecimals = async() => 0;
      should(await client.absoluteToInteger(1)).equal(1)
    })

    it("converts really huge numbers with no loss", async() => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      client.erc20Client.getTokenDecimals = async() => 25;

      should(await client.absoluteToInteger(await client.integerToAbsolute(10))).equal(10)
    })
  })

  describe('sending tokens', async() => {

    it('sends tokens from bank to a new address and then sends it back to bank', async () => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 0.01

      should(await client.getBalance(client.getBankAddress())).be.aboveOrEqual(amount)

      // create a new empty address
      const emptyAddress = (await client.generateAddress()).public

      should.equal(await client.getBalance(emptyAddress), 0, "Balance should equal 0")
      should.equal(await client.erc20Client.getBalance(emptyAddress), 0, "ETH balance should be 0")

      let txHash = await client.sendToAddress(emptyAddress, amount)
      should(txHash).be.String()
      await client.waitForTransactionConfirmation(txHash)

      // check its balance
      should.equal(await client.getBalance(emptyAddress), await client.integerToAbsolute(amount))
      should.equal(await client.erc20Client.getBalance(emptyAddress), 0, "ETH balance should be 0")

      txHash = await client.moveBalanceToBank(emptyAddress)
      await client.waitForTransactionConfirmation(txHash)

      should.equal(await client.getBalance(emptyAddress), 0, "Balance should equal 0")
      // For some reason, estimateGas returns higher value than it really needs
      // So there is a bit of ETH left
      // should.equal(await client.erc20Client.getBalance(emptyAddress), 0,
      //              "ETH balance should be 0")
    }).timeout(360 * 1000)

    it('supports very big amounts', async () => {
      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 5000

      // create a new empty address
      const emptyAddress = (await client.generateAddress()).public

      let txHash = await client.sendToAddress(emptyAddress, amount)
      should(txHash).be.String()
      await client.waitForTransactionConfirmation(txHash)

      should.equal(await client.getBalance(emptyAddress), await client.integerToAbsolute(amount))
    }).timeout(360 * 1000)

  })

})
