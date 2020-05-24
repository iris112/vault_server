import debug from 'debug'
import sleep from 'sleep'
import {Numbers} from '@cc-dev/math'
import {expect} from 'chai'
import TestApp from '../../../app'

const log = debug('CCVault:CardanoClient')

describe('CardanoClient', async() => {

  const currency = 'ada'

  describe('send ADA', async () => {

    it('sends ADA from bank to a new address and back to bank', async () => {

      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 0.001

      // make sure we have enought amount in our bank
      let bankBalance = await client.getBalance(client.getBankAddress())
      expect(bankBalance).to.be.above(parseInt(client.mallet.web3.toWei(0.05)))

      // create a new empty address
      let pair = await client.generateAddress()
      const emptyAddress = pair.public

      expect(pair.public).to.have.length(42);
      expect(pair.private).to.have.length(64);

      // get block count
      expect(await client.countBlocks()).to.be.a('number')

      // make sure the new account is generated and has empty balance
      expect(await client.getBalance(emptyAddress)).to.be.equal(0)

      // send more coins from bank
      let tx = await client.sendToAddress(emptyAddress, amount)
      sleep.sleep(20)
      let receipt = await client.mallet.getReceipt(tx)

      expect(receipt.transactionHash).to.be.equal(tx)
      expect(receipt.status).to.be.equal(1)
      let newAccountBalance = await client.getBalance(emptyAddress)
      expect(newAccountBalance).to.be.equal(parseInt(client.mallet.web3.toWei(amount)))

      // lets move the funds back to bank
      bankBalance = await client.getBalance(client.getBankAddress())

      tx = await client.moveBalanceToBank(pair.public, pair.private)
      sleep.sleep(20)

      expect(await client.getBalance(emptyAddress)).to.be.lessThan(parseInt(client.mallet.web3.toWei(amount)))
      expect(await client.getBalance(client.getBankAddress())).to.be.greaterThan(bankBalance)

    }).timeout(360 * 2000)

  })

})
