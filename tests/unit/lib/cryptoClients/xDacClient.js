import debug from 'debug'
import {expect} from 'chai'
import TestApp from '../../../app'
import { JsSignatureProvider } from 'eosjs'

const log = debug('CCVault:xDacClient')

describe('xDacClient', async () => {

  const currency = 'xdac'
  const amount = 0.0100
  let app, client, pair

  it('creates new address', async () => {

    app = new TestApp()
    client = await app.CryptoClientSettings.getClient(currency)

    // create a new empty address
    pair = await client.generateAddress()
    const check = `${client.config.bank.accountName}.`

    expect(pair.public).to.have.string(check);
    expect(pair.public).to.have.lengthOf.above(check.length);
    expect(isNaN(pair.private)).to.be.false;

  })

  it('sends xdac from bank to new address', async () => {

    // make sure we have enough amount in our bank
    let bankBalance = await client.getBalance(client.config.bank.accountName)
    expect(bankBalance).to.be.above(10)

    // send some coins from bank to new address
    let receiverBalance = await client.getBalance(client.config.wallet.accountName)

    await client.sendToAddress(client.config.wallet.accountName, amount)
    expect(await client.getBalance(client.config.bank.accountName)).to.be.approximately(bankBalance - amount, 0.0001)
    expect(await client.getBalance(client.config.wallet.accountName)).to.be.approximately(receiverBalance + amount, 0.0001)

  })

  it('sends xdac back to bank', async () => {

    const tx = await client.moveBalanceToBank(client.config.wallet.accountName, client.config.wallet.privateKey)

    expect(tx.transaction_id).to.be.a('string')
    expect(tx.processed.receipt.status).to.be.equal('executed')

  })

})
