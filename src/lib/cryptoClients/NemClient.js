import debug        from 'debug'
import crypto       from 'crypto'
import nem          from 'nem-sdk';
import CryptoClient from './CryptoClient'

const log = debug('CCVault:NemClient')

export default class NemClient extends CryptoClient {

  constructor(config) {
    super(config)
    this.endpoint = nem.model.objects.create("endpoint")(`${config.client.protocol}://${config.client.host}`, config.client.port);
  }

  async getBalance(address) {
    return (await nem.com.requests.account.data(this.endpoint, address)).account.balance
  }

  async generateAddress() {

    const privateKey = nem.utils.convert.ua2hex(nem.crypto.nacl.randomBytes(32))
    const publicKey = nem.crypto.keyPair.create(privateKey).publicKey.toString()

    return {
      public: nem.model.address.toAddress(publicKey, this.config.client.network),
      private: privateKey
    }
  }

  async sendToAddress(toPublicKey, amount, fromPrivateKey = this.getBankPK()) {

    const common = nem.model.objects.create('common')('', fromPrivateKey)
    const transferTransaction = await nem.model.objects.create('transferTransaction')(toPublicKey, amount)
    const transactionEntity = await nem.model.transactions.prepare('transferTransaction')(common, transferTransaction, this.config.client.network)

    const timeStamp = await nem.com.requests.chain.time(this.endpoint)
    const ts = Math.floor(timeStamp.receiveTimeStamp / 1000);

    transactionEntity.timeStamp = ts
    transactionEntity.deadline = ts + 60 * 60

    return nem.model.transactions.send(common, transactionEntity, this.endpoint)
  }

  async moveBalanceToBank(fromPublicKey, fromPrivateKey) {

    const balance = await this.getBalance(fromPublicKey)
    const common = nem.model.objects.create('common')('', fromPrivateKey)
    const transferTransaction = await nem.model.objects.create('transferTransaction')(this.getBankAddress(), parseFloat(nem.utils.format.nemValue(balance).join('.')))
    const transactionEntity = await nem.model.transactions.prepare('transferTransaction')(common, transferTransaction, this.config.client.network)

    return await this.sendToAddress(this.getBankAddress(), parseFloat(nem.utils.format.nemValue(balance - transactionEntity.fee).join('.')), fromPrivateKey)
  }

  async countBlocks() {
    this.lastChainBlock = await nem.com.requests.chain.lastBlock(this.endpoint)
    return this.lastChainBlock.height
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.hash, 'txData.hash must be set.')
    console.assert(txData.blockHeight, 'txData.blockHeight must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.hash}-${txData.blockHeight}`)
      .digest('hex')
  }

  isValidRecord(record) {
    return record !== null && record.amount > 0 && record.type === 257
  }

  async findTransaction(txId, extraTxData = {}) {

    let tx = await nem.com.requests.transaction.byHash(this.endpoint, txId)

    if (tx) {

      let transaction = tx.transaction
      transaction.id = tx.meta.id
      transaction.hash = tx.meta.hash.data
      transaction.blockHeight = tx.meta.height

      let metaUid = this.calculateTransactionMetaUid(transaction)
      if (this.isValidRecord(transaction) && metaUid === extraTxData.metaUid) {
        return this._adaptSingleTransaction({ ...extraTxData, ...transaction })
      }
    }

  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {

    let transactions = []
    let totalBlocks = maxBlockIndex || await this.countBlocks()

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)

    while(blockIndex++ < totalBlocks) {

      let block = await nem.com.requests.chain.blockByHeight(this.endpoint, blockIndex)

      if (block.transactions.length) {

        log('processing block number %d of %d, with %d payments', block.height, totalBlocks, block.transactions.length)

        for(const transaction of block.transactions){
          if (this.isValidRecord(transaction)) {
            let txs = await nem.com.requests.account.transactions.incoming(this.endpoint, transaction.recipient) // this only gives latest 25 records
            for(const tx of txs.data){
              if (tx.transaction.signature === transaction.signature) {
                transaction.id = tx.meta.id
                transaction.hash = tx.meta.hash.data
                transaction.blockHeight = block.height
                transactions.push(transaction)
              }
            }
          }
        }
      }
    }

    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(transaction, totalBlockCount) {

    totalBlockCount = totalBlockCount || await this.countBlocks()
    let confirmations = totalBlockCount - transaction.blockHeight

    return {
      metaUid: this.calculateTransactionMetaUid(transaction),
      txHash: transaction.hash,
      txBlock: transaction.blockHeight,
      currency: this.config.currency,
      address: transaction.recipient,
      amount: transaction.amount,
      category: 'deposit',
      confirmations,
      status: confirmations > this.config.minConfirmations ? 'confirmed' : 'pending',
      createdAt: transaction.timeStamp
    }
  }

  getBankAddress() {
    return this.getBank('address')
  }

  nemToXemValue(data) {
    if (data === undefined) return data;
    let o = parseFloat(data);
    if (!o) {
        return 0;
    }
    return o * 1000000;
  }

  async clientStatus() {

    const blockHeight = await this.countBlocks()

    return {
      blockHeight,
      connections: 'n/a',
      lastBlockTime: this.lastChainBlock.timeStamp,
      lastChecked: Date.now(),
    }
  }

}
