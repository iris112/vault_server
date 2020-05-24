import debug from 'debug'
import sleep from 'sleep'
import {expect} from 'chai'
import { Numbers }  from '@cc-dev/math'
import TestApp from '../../../app'

const log = debug('CCVault:ElectroneumClient')

describe('ElectroneumClient', async() => {

  const currency = 'etn'

  describe('send etn', async () => {

    it('sends etn among bank and test accounts', async () => {

      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 0.001

      // test division conversion
      expect(Numbers.toAtomicUnits(1)).to.be.equal(1000000000000)
      expect(Numbers.toAtomicUnits(0.01)).to.be.equal(10000000000)

      // make sure we have enought amount in our bank
      let bankBalance = await client.getBalance(client.config.bank.accountIndex)
      expect(bankBalance).to.be.above(Numbers.toAtomicUnits(10))

      // create a new empty address
      let pair = await client.generateAddress()

      expect(pair.public).to.have.length(95);
      expect(isNaN(pair.private)).to.be.false;

      // check new account is empty
      expect(await client.getBalance(pair.private)).to.be.equal(0)

      // send some coins from bank to new address
      const transaction = await client.sendToAddress(pair.public, amount)

      // lets wait a bit for transfer to be included in the first block
      let i = 0
      while(i < 10) {
        i++
        let transfers = (await (await client.getWallet()).incoming_transfers('all')).transfers
        sleep.sleep(30)
        for(const transfer of transfers) {
          if (transfer.tx_hash === transaction.tx_hash) {
            expect(transaction.amount).to.be.equal(Numbers.toAtomicUnits(amount))
            i = 100
          }
        }
      }

      if (i < 100) throw new Error("We couldn't find incoming transaction");

    }).timeout(360 * 2000)

  })

})
