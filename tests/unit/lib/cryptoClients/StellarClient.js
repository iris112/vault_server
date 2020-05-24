import debug from 'debug'
import should from 'should'
import {expect} from 'chai'
import TestApp from '../../../app'

const info = debug('CCVault:StellarClient')

describe('StellarClient', async() => {

  const currency = 'xlm'

  describe('send XLM', async () => {

    it('sends xlm from bank to a new address and back to bank', async () => {

      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 0.01

      // create a new empty address
      let pair = await client.generateAddress()
      const emptyAddress = pair.public

      expect(pair.public).to.have.length(56);
      expect(pair.private).to.have.length(56);

      // make sure we have enought amount in our bank to create new account
      expect(parseFloat(await client.getBalance(client.getBankAddress()))).to.be.above(3)

      // make sure the new account is generated and has the min required amount it in
      // see https://www.stellar.org/developers/guides/concepts/fees.html#minimum-account-balance
      expect(await client.getBalance(emptyAddress)).to.be.equal('2.5000000')

      // send more coins from bank
      await client.sendToAddress(emptyAddress, '0.2')
      expect(await client.getBalance(emptyAddress)).to.be.equal('2.7000000')

      await client.moveBalanceToBank(pair.public, pair.private)
      expect(await client.getBalance(emptyAddress)).to.be.equal('2.4999900') // -100 for the fee

    }).timeout(360 * 2000)

  })

})
