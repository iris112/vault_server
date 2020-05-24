import debug from 'debug'
import Chai from 'chai'
import {expect} from 'chai'
import ChaiString from 'chai-string'
import sleep from 'sleep'
import TestApp from '../../../app'

Chai.use(ChaiString);

const log = debug('CCVault:TronClient')

describe('TronClient', async() => {

  const currency = 'trx'

  describe('send TRON', async () => {

    it('sends tron from bank to a new address and back to bank', async () => {

      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 1
      const waitSec = 17 // there is a average 15 sec block time

      // create a new empty address
      let pair = await client.generateAddress()
      const emptyAddress = pair.public

      expect(pair.public).to.have.length(34);
      expect(pair.private).to.have.length(64);

      // get block count
      expect(await client.countBlocks()).to.be.a('number')

      // make sure we have enought amount in our bank
      expect(await client.getBalance(client.getBankAddress())).to.be.above(parseInt(client.server.toSun(3)))

      // make sure the new account is generated and has empty balance
      expect(await client.getBalance(emptyAddress)).to.be.equal(0)

      // send more coins from bank
      let tx = await client.sendToAddress(emptyAddress, amount)
      sleep.sleep(waitSec)
      let txInfo = (await client.server.trx.getTransaction(tx.transaction.txID)).raw_data.contract[0].parameter.value

      // lets see if the transaction has been recorded on the blockchain
      /*let incomingTx = await client.server.trx.getTransactionsRelated(pair.public, 'to')
      expect(incomingTx[0].txID).to.be.equalIgnoreCase(tx.transaction.txID)*/

      expect(tx.result).to.be.true
      expect(txInfo.amount).to.be.equal(amount)
      expect(txInfo.to_address).to.be.equalIgnoreCase(client.server.address.toHex(pair.public))
      expect(txInfo.owner_address).to.be.equalIgnoreCase(client.config.bank.addressHex)
      expect(await client.getBalance(emptyAddress)).to.be.equal(amount)

      // lets move the funds back to bank
      tx = await client.moveBalanceToBank(pair.public, pair.private)
      sleep.sleep(waitSec)
      txInfo = (await client.server.trx.getTransaction(tx.transaction.txID)).raw_data.contract[0].parameter.value

      expect(tx.result).to.be.true
      expect(txInfo.amount).to.be.equal(amount)
      expect(txInfo.to_address).to.be.equalIgnoreCase(client.config.bank.addressHex)
      expect(txInfo.owner_address).to.be.equalIgnoreCase(client.server.address.toHex(pair.public))
      expect(await client.getBalance(emptyAddress)).to.be.equal(0)

    }).timeout(360 * 2000)

  })

})
