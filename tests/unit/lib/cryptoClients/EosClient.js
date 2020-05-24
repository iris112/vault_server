import debug from 'debug'
import {expect} from 'chai'
import TestApp from '../../../app'
import { JsSignatureProvider } from 'eosjs'

const info = debug('CCVault:EosClient')

describe('EosClient', async() => {

  const currency = 'eos'

  describe('send eos', async () => {

    it('sends eos among 2 accounts with memo', async () => {

      const app = new TestApp()
      const client = await app.CryptoClientSettings.getClient(currency)
      const amount = 0.0100

      // in case you need more CPU bandwidth
      /*await client.api.transact({
        actions: [
          {
            account: 'eosio',
            name: 'delegatebw',
            authorization: [{
              actor: client.config.wallet.bankAccountName,
              permission: 'active',
            }],
            data: {
              from: client.config.wallet.bankAccountName,
              receiver: client.config.wallet.bankAccountName,
              stake_net_quantity: '1.0000 EOS',
              stake_cpu_quantity: '1.0000 EOS',
              transfer: false,
            }
          }
        ]
      }, {
        blocksBehind: 1,
        expireSeconds: 10,
      });*/

      // make sure we have enought amount in our bank
      let bankBalance = await client.getBalance(client.config.bank.accountName)
      expect(bankBalance).to.be.above(10)

      // create a new empty address
      let pair = await client.generateAddress()
      const check = `${client.config.bank.accountName}.`

      expect(pair.public).to.have.string(check);
      expect(pair.public).to.have.lengthOf.above(check.length);
      expect(isNaN(pair.private)).to.be.false;

      // send some coins from bank to new address
      let receiverBalance = await client.getBalance(client.config.wallet.accountName)

      await client.sendToAddress(client.config.wallet.accountName, amount)
      expect(await client.getBalance(client.config.bank.accountName)).to.be.approximately(bankBalance - amount, 0.0001)
      expect(await client.getBalance(client.config.wallet.accountName)).to.be.approximately(receiverBalance + amount, 0.0001)

      // send from 3rd party test wallet back to exchange account we just created
      client.api.signatureProvider = new JsSignatureProvider([client.config.wallet.activePrivateKey]);
      await client.api.transact({
        actions: [
          {
            account: 'eosio.token',
            name: 'transfer',
            authorization: [{
              actor: client.config.wallet.accountName,
              permission: 'active',
            }],
            data: {
              from: client.config.wallet.accountName,
              to: client.config.bank.accountName,
              quantity: `${amount.toFixed(4)} EOS`,
              memo: pair.private,
            },
          }
        ]
      }, {
        blocksBehind: 1,
        expireSeconds: 10,
      });

    }).timeout(360 * 2000)

  })

})
