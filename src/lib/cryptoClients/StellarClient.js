import debug        from 'debug'
import StellarSdk   from 'stellar-sdk'
import crypto       from 'crypto'
import { Numbers }  from '@cc-dev/math'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:StellarClient')

export default class StellarClient extends CryptoClient {

  constructor(config) {
    super(config)

    if(config.client.network == 'Testnet') {
      StellarSdk.Network.useTestNetwork()
    }

    const connection = `${config.client.protocol}${config.client.host}` + (config.client.port ? `:${config.client.port}` : ``)
    this.server = new StellarSdk.Server(connection)
  }

  async getBalance(publicKey) {
    let result = await this.loadAccount(publicKey)
    return result.balances.find(el => el.asset_type === 'native').balance
  }

  async generateAddress() {

    let pair = await StellarSdk.Keypair.random()

    let transaction = new StellarSdk.TransactionBuilder(await this.getBankAccount())
      .addOperation(StellarSdk.Operation.createAccount({
        destination: pair.publicKey(),
        startingBalance: '2.5' // see https://www.stellar.org/developers/guides/concepts/fees.html#minimum-account-balance
      }))
      .build();

    transaction.sign(this.getSignature());
    let res = await this.server.submitTransaction(transaction)

    return {
      public: pair.publicKey(),
      private: pair.secret()
    }
  }

  async sendToAddress(toPublicKey, amount) {

    let transaction = new StellarSdk.TransactionBuilder(await this.getBankAccount())
      .addOperation(StellarSdk.Operation.payment({
        destination: toPublicKey,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      }))
      .build()
    transaction.sign(this.getSignature())

    return this.server.submitTransaction(transaction)
  }

  async moveBalanceToBank(fromPublicKey, fromPrivateKey) {

    let balance = await this.getBalance(fromPublicKey);

    // we need to have min 2.5 into the account
    if (balance < 2.5) return;

    let transaction = new StellarSdk.TransactionBuilder(await this.getAccount(fromPublicKey))
      .addOperation(StellarSdk.Operation.payment({
        destination: this.getBankAddress(),
        asset: StellarSdk.Asset.native(),
        amount: (parseFloat(balance) - 2.5000000).toFixed(8) + '',
      }))
      .build()
    transaction.sign(this.getSignature(fromPrivateKey))

    return this.server.submitTransaction(transaction)
  }

  async loadAccount(publicKey) {
    return this.server.accounts().accountId(publicKey).call()
  }

  async getAccount(publicKey) {
    return new StellarSdk.Account(
      publicKey,
      (await this.loadAccount(publicKey)).sequence
    )
  }

  async getBankAccount() {
    return this.getAccount(this.getBankAddress())
  }

  getSignature(privateKey = this.getBankPK()) {
    return StellarSdk.Keypair.fromSecret(privateKey)
  }

  async countBlocks() {
    let ledger = await this.server.ledgers().limit(1).order('desc').call()
    this.lastChainBlock = ledger.records[0];
    return this.lastChainBlock.sequence
  }

  async getBlock(height) {
    return this.server.ledgers().ledger(height).call()
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.transaction_hash, 'txData.transaction_hash must be set.')
    console.assert(txData.id, 'txData.id must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.transaction_hash}-${txData.id}`)
      .digest('hex')
  }

  /**
   * Payment of type native is XLM
   *
   * @param record
   * @returns {boolean}
   */
  isValidRecord(record) {
    return record !== null && record.asset_type === 'native'
  }

  async findTransaction(txId, extraTxData = {}) {
    const payments = (await this.server.payments().forTransaction(txId).call()).records
    for(const payment of payments) {
      const metaUid = this.calculateTransactionMetaUid(payment)
      if(this.isValidRecord(payment) && metaUid === extraTxData.metaUid){
        return this._adaptSingleTransaction({ ...extraTxData, ...payment })
      }
    }
  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {

    let transactions = []
    let totalBlocks = maxBlockIndex || await this.countBlocks()

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)

    while(blockIndex++ < totalBlocks) {

      let block = await this.getBlock(blockIndex)
      let payments = (await block.payments()).records
      log('processing block number %d of %d, with %d payments', block.sequence, totalBlocks, payments.length)

      for(const payment of payments){
        if (this.isValidRecord(payment)) {
          payment.blockNumber = block.sequence // add missing blockNumber from block to spare another call
          transactions.push(payment)
        }
        else log(`asset not native or invalid`)
      }
    }

    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(payment, totalBlockCount) {

    totalBlockCount = totalBlockCount || await this.countBlocks()

    if (!payment.blockNumber) {
      payment.blockNumber = (await payment.transaction()).ledger_attr;
    }

    let confirmations = totalBlockCount - payment.blockNumber

    return {
      metaUid: this.calculateTransactionMetaUid(payment),
      txHash: payment.transaction_hash,
      txBlock: payment.blockNumber,
      currency: this.config.currency,
      address: payment.to,
      amount: Numbers.toBigInt(parseFloat(payment.amount) * Math.pow(10, 8)),
      category: 'deposit',
      confirmations,
      status: confirmations > this.getMinConfirmations() ? 'confirmed' : 'pending',
      createdAt: payment.created_at ? Date.parse(payment.created_at) : undefined,
    }
  }

  async clientStatus() {

    const blockHeight = await this.countBlocks()

    return {
      blockHeight,
      connections: 'n/a',
      lastBlockTime: Date.parse(this.lastChainBlock.closed_at),
      lastChecked: Date.now(),
    }
  }

}
