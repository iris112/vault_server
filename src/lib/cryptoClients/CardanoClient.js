import debug        from 'debug'
import crypto       from 'crypto'
import { Numbers }  from '@cc-dev/math'
import keythereum   from 'keythereum'
import Mallet       from '@iohk/mallet/lib/mallet'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:CardanoClient')

export default class CardanoClient extends CryptoClient {

  constructor(config) {
    super(config)
    this.mallet = new Mallet(config.client.endpoint, config.client.walletPath)
    this.mallet.selectAccount(this.getBankAddress())
  }

  async getBalance(publicKey) {
    return parseInt(await this.mallet.getBalance(publicKey)) // in wei
  }

  async generateAddress() {

    const dk = keythereum.create();

    return {
      public: '0x' + keythereum.dump(this.getBankPassphrase(), dk.privateKey, dk.salt, dk.iv).address,
      private: dk.privateKey.toString("hex")
    }
  }

  async sendToAddress(toPublicKey, amount) {
    return await this.mallet.sendTransaction(
      {
        gas: this.getBank('gas'),
        gasPrice: this.getBank('gasPrice'),
        to: toPublicKey,
        value: parseInt(this.mallet.web3.toWei(amount)),
      },
      this.getBankPassphrase()
    )
  }

  /**
   * This can leave some residual wei from the unspent gas in the account
   */
  async moveBalanceToBank(fromPublicKey, fromPrivateKey) {

    // change account
    if (!this.mallet.listAccounts().includes(fromPublicKey)) {
      this.mallet.importPrivateKey(fromPrivateKey, this.getBankPassphrase())
    }

    this.mallet.selectAccount(fromPublicKey)

    const balance = await this.getBalance(fromPublicKey)
    const fee = this.getBank('gas') * this.getBank('gasPrice')
    const tx = await this.sendToAddress(this.getBankAddress(), this.mallet.web3.fromWei(balance - fee))

    // restore bank account
    this.mallet.selectAccount(this.getBankAddress())

    return tx
  }

  async countBlocks() {
    this.lastChainBlock = await this.mallet.web3.eth.getBlock('latest')
    return this.lastChainBlock.number
  }

  async getBlock(blockIndex) {
    return await this.mallet.web3.eth.getBlock(blockIndex)
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
    return record !== null && record.to !== null && record.value > 0
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

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)

    while(blockIndex++ < totalBlocks) {

      let block = await this.getBlock(blockIndex)
      log(block)
      log('processing block number %d of %d, with %d txs', block.number, totalBlocks, block.transactions.length)

      for(const tx of block.transactions){
        if(this.isValidRecord(tx)) {
          transactions.push(tx)
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
      status: confirmations > this.config.minConfirmations ? 'confirmed' : 'pending',
      createdAt: contract.transaction.raw_data.timestamp,
    }
  }

  async clientStatus() {

    const blockHeight = await this.countBlocks()

    return {
      blockHeight,
      connections: 'n/a',
      lastBlockTime: this.lastChainBlock.timestamp,
      lastChecked: Date.now(),
    }
  }

}
