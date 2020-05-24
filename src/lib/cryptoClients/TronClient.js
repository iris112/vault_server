import debug        from 'debug'
import crypto       from 'crypto'
import TronWeb      from 'tronweb'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:TronClient')

export default class TronClient extends CryptoClient {

  constructor(config) {
    super(config)
    this.server = new TronWeb(
        config.client.fullNode,
        config.client.solidityNode,
        config.client.eventServer,
        this.getBankPK()
    );
  }

  async getBalance(publicKey) {
    return await this.server.trx.getBalance(publicKey)
  }

  async generateAddress() {

    let pair = await this.server.createAccount()

    if (!this.server.isAddress(pair.address.hex)) throw new Error('invalid address');

    return {
      public: pair.address.base58,
      private: pair.privateKey
    }
  }

  async sendToAddress(toPublicKey, amount) {
    return await this.server.trx.sendTransaction(toPublicKey, amount)
  }

  async moveBalanceToBank(fromPublicKey, fromPrivateKey) {

    // set private key of the user address
    this.server.setPrivateKey(fromPrivateKey)
    const tx = await this.sendToAddress(this.getBankAddress(), await this.getBalance(fromPublicKey))

    // restore bank private key
    this.server.setPrivateKey(this.getBankPK())

    return tx
  }

  async countBlocks() {
    this.lastChainBlock = await this.server.trx.getCurrentBlock()
    return this.lastChainBlock.block_header.raw_data.number
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.transaction.txID, 'txData.transaction.txID must be set.')
    console.assert(txData.block.block_header.raw_data.number, 'txData.block.block_header.raw_data.number must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.transaction.txID}-${txData.block.block_header.raw_data.number}`)
      .digest('hex')
  }

  isValidRecord(record) {
    return record !== null && record.type === 'TransferContract' && (typeof record.parameter.value) === 'object'
  }

  async findTransaction(txId, extraTxData = {}) {

    let block = await this.server.trx.getBlock(extraTxData.txBlock)
    let transaction = await this.server.trx.getTransaction(txId)

    for(const contract of transaction.raw_data.contract){

      contract.block = block
      contract.transaction = transaction

      let metaUid = this.calculateTransactionMetaUid(contract)
      if (this.isValidRecord(contract) && metaUid === extraTxData.metaUid) {
        return this._adaptSingleTransaction({ ...extraTxData, ...contract })
      }
    }

  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {

    let transactions = []
    let totalBlocks = maxBlockIndex || await this.countBlocks()
    const blocks = await this.server.trx.getBlockRange(blockIndex, maxBlockIndex)

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)

    for(const block of blocks) {

      if (block.transactions) {

        let transaction = await this.server.trx.getTransactionFromBlock(block.block_header.raw_data.number)
        let contracts = await this.server.trx.getTransaction(transaction.txID)

        log('processing block number %d of %d, with %d payments', block.block_header.raw_data.number, totalBlocks, block.transactions.length)

        for(const contract of contracts.raw_data.contract){
          if (this.isValidRecord(contract)) {
            contract.block = block
            contract.transaction = transaction
            transactions.push(contract)
          }
        }
      }
    }

    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(contract, totalBlockCount) {

    totalBlockCount = totalBlockCount || await this.countBlocks()
    let confirmations = totalBlockCount - contract.block.block_header.raw_data.number

    return {
      metaUid: this.calculateTransactionMetaUid(contract),
      txHash: contract.transaction.txID,
      txBlock: contract.block.block_header.raw_data.number,
      currency: this.config.currency,
      address: this.server.address.fromHex(contract.parameter.value.to_address),
      amount: contract.parameter.value.amount,
      category: 'deposit',
      confirmations,
      status: confirmations > this.getMinConfirmations() ? 'confirmed' : 'pending',
      createdAt: contract.transaction.raw_data.timestamp,
    }
  }


  getBankAddress() {
    return this.getBank().addressBase58;
  }

  async clientStatus() {

    const blockHeight = await this.countBlocks()

    return {
      blockHeight,
      connections: 'n/a',
      lastBlockTime: this.lastChainBlock.block_header.raw_data.number,
      lastChecked: Date.now(),
    }
  }

}
