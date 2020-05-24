import debug from 'debug'
import {expect} from 'chai'
import sleep from 'sleep'
import nem from 'nem-sdk';
import TestApp from '../../../app'

const log = debug('CCVault:NemClient')

describe('NemClient', async() => {

  const currency = 'xem'
  const amount = 0.0700
  let app, client, pair, bankBalance

  it('test utils', async () => {

    app = new TestApp()
    client = await app.CryptoClientSettings.getClient(currency)

    const xem = 10003002
    expect(nem.utils.format.nemValue(xem)).to.eql(['10', '003002'])
    expect(client.nemToXemValue('10.003002')).to.be.equal(xem)

  })

  it('creates new address', async () => {

    // create a new empty address
    pair = await client.generateAddress()

    expect(pair.public).to.have.lengthOf(40);
    expect(pair.private).to.have.lengthOf(64);

  })

  it('tests blockchain', async () => {

    // get block count thru status
    expect((await client.clientStatus()).blockHeight).to.be.a('number')

  })

  it('sends xem from bank to new address', async () => {

    // make sure we have enough amount in our bank
    bankBalance = await client.getBalance(client.getBankAddress())
    expect(parseInt(nem.utils.format.nemValue(bankBalance)[0])).to.be.above(1)

    // make sure the new account has empty balance
    expect(await client.getBalance(pair.public)).to.be.equal(0)

    // send coins from bank
    let tx = await client.sendToAddress(pair.public, amount)
    expect(tx.code).to.be.equal(1)
    expect(tx.type).to.be.equal(1)
    expect(tx.message).to.be.equal('SUCCESS')

    sleep.sleep(65) // 1 minute block time
    const incoming = await nem.com.requests.account.transactions.incoming(client.endpoint, pair.public)

    expect(incoming.data[0].meta.hash.data).to.be.equal(tx.transactionHash.data)
    expect(incoming.data[0].transaction.amount).to.be.equal(client.nemToXemValue(amount))
    expect(incoming.data[0].transaction.recipient).to.be.equal(pair.public)

    expect(await client.getBalance(pair.public)).to.be.equal(client.nemToXemValue(amount))

  }).timeout(360 * 2000)

  it('sends xem back to bank', async () => {

    bankBalance = await client.getBalance(client.getBankAddress())
    const tx = await client.moveBalanceToBank(pair.public, pair.private)

    expect(tx.code).to.be.equal(1)
    expect(tx.type).to.be.equal(1)
    expect(tx.message).to.be.equal('SUCCESS')

    sleep.sleep(65) // 1 minute block time

    expect(await client.getBalance(pair.public)).to.be.equal(0)
    expect(await client.getBalance(client.getBankAddress())).to.be.above(bankBalance)

  }).timeout(360 * 2000)

})