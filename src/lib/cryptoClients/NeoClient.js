import debug        from 'debug'
import crypto       from 'crypto'
import { Numbers }  from '@cc-dev/math'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:NeoClient')

export default class NeoClient extends CryptoClient {

  constructor(config) { super(config) }

  transfer(from, to, amount) {
    return this._callRpc(null, 'sendtoaddress', [from, to, amount.toString()])
  }

  async generateAddress() {
    return {
      public: await this._callRpc(null, 'getnewaddress'),
      private: null,
    }
  }

  getPeers() {
    return this._callRpc(null, 'getpeers')
  }

  getRawTx(hash) {
    return this._callRpc(null, 'getrawtransaction', [hash, 1])
  }

  async countBlocks() {
    return (await this._callRpc(null, 'getblockcount'))[0] - 1 // todo(Marci): not tested yet!!!
  }

  async getBlock(height) {
    return await this._callRpc(null, 'getblock', [parseInt(height), 1])
  }

  async getBalance(account) {
    return (await this._callRpc(null, 'getbalance', [account])).balance
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.txid, 'txData.txid must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.txid}`)
      .digest('hex')
  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {
    let transactions = []

    let totalBlocks = maxBlockIndex || await this.countBlocks()
    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)
    while(blockIndex++ < totalBlocks) {
      log('block index ', blockIndex)
      // get next block to process:
      let block = await this.getBlock(blockIndex)
      log('processing block number %d of %d, with %d txs', block.number, totalBlocks, block.tx.length)

      // for NEO, the first block is always a MinerTransaction so the docs says we can skip it (see here http://docs.neo.org/en-us/exchange/v2.7.3.html#deposit-records)
      if(block.tx.length <= 1) { continue } // skip MinerTransaction

      for(const tx of block.tx){
        if(this.isValidTx(tx)) {
          tx.txBlock = block.index // add missing block index property
          tx.createdAt = block.time * 1000,
          transactions.push(tx)
        }
      }
    }

    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(txData, totalBlockCount) {
    totalBlockCount = totalBlockCount || await this.countBlocks()
    txData.confirmations = totalBlockCount - txData.blockNumber

    const status = this.isConfirmedTransaction(txData) ? 'confirmed' : 'pending'
    return {
      metaUid: this.calculateTransactionMetaUid(txData),
      txHash: txData.txid,
      txBlock: txData.txBlock,
      currency: this.config.currency,
      address: txData.vout[0].address,
      amount: Numbers.toBigInt(txData.vout[0].value),
      category: 'deposit',
      confirmations: txData.confirmations,
      status,
      createdAt: txData.createdAt ? txData.createdAt : undefined,
    }
  }

  isValidTx(tx, currency) {
    return (tx.type === 'ContractTransaction')
  }

  async findTransaction(txId, extraTxData = {}) {
    let transaction = await this._callRpc(null, 'getrawtransaction', [txId, 1])
    return this._adaptSingleTransaction({ ...extraTxData, ...transaction })
  }

  async clientStatus() {
    const blockHeight = await this.countBlocks()
    const lastChainBlock = await this.getBlock(blockHeight)

    return {
      blockHeight,
      connections: await this.getPeers(),
      lastBlockTime: lastChainBlock.time * 1000,
      lastChecked: Date.now(),
    }
  }

}
