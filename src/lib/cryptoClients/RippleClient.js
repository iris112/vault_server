import debug          from 'debug'
import crypto         from 'crypto'
import { Numbers } from '@cc-dev/math'
import { RippleAPI }  from 'ripple-lib'
import CryptoClient   from './CryptoClient'

const log = debug('CCVault:RippleClient')

export default class RippleClient extends CryptoClient {

  constructor(config) {
    super(config)

    this.api = new RippleAPI({ server: config.client.host })
    this.api.on('error', RippleClient.onError)
    this.api.on('connected', RippleClient.onConnected)
    this.api.on('disconnected', RippleClient.onDisonnected)

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = config.tlsRejectUnauthorized;
  }

  static onConnected() { log('> onConnected()') }

  static onDisonnected(code) { log(`> onDisonnected(${code})`) }

  static onError(errorCode, errorMessage) {
    log(errorCode + ': ' + errorMessage)
  }

  async connect() {
    await this.api.connect()
  }

  /**
   * Generate a ripple address
   * @returns {Promise<{public: *, private: *}>}
   */

  async generateAddress() {
    let address = this.api.generateAddress()

    return {
      public: address.address,
      private: address.secret,
    }
  }

  async sendXrp(fromAddress, secret, to, amount) {

    const payment = {
      source: {
        address: fromAddress,
        maxAmount: {
          value: amount.toString(),
          currency: 'XRP',
        },
      },
      destination: {
        address: to,
        amount: {
          value: amount.toString(),
          currency: 'XRP',
        },
      },
    }
    let prepared = await this.api.preparePayment(fromAddress, payment)
    log('prepared %O', prepared)

    let signedTx = await this.api.sign(prepared.txJSON, secret)
    log('signed %O', signedTx)

    let result = await this.api.submit(signedTx.signedTransaction)
    log('result %O', result)

    return result
  }

  getBalances(address) {
    const options = {
      currency: 'XRP',
    }
    return this.api.getBalances(address, options)
  }

  getBlock(options) {
    return this.api.getLedger(options)
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.id, 'txData.id must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.id}`)
      .digest('hex')
  }

  async countBlocks() {
    return (await this.api.getLedger()).ledgerVersion
  }

  async listTransactionsSinceBlock(blockIndex) {
    let transactions = []
    let totalBlocks = await this.countBlocks()
    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)
    while(blockIndex++ < totalBlocks) {
      log('block index ', blockIndex)
      // get next block to process:
      let block = await this.getBlock({
        ledgerVersion: blockIndex,
        includeAllData: true,
        includeTransactions: true,
      })

      if(!(block.transactions && block.transactions instanceof Array)) continue
      log('processing block number %d of %d, with %d txs', block.ledgerVersion, totalBlocks, block.transactions.length)

      for(const tx of block.transactions){
        if(this.isValidTx(tx, this.config.currency)) {
          tx.createdAt = block.timestamp * 1000 // add missing createdAt timestamp from block
          transactions.push(tx)
        }
      }
    }

    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(txData, totalBlockCount) {
    totalBlockCount = totalBlockCount || await this.countBlocks()
    txData.confirmations = totalBlockCount - txData.blockNumber

    return {
      metaUid: this.calculateTransactionMetaUid(txData),
      txHash: txData.id,
      txBlock: txData.outcome.ledgerVersion,
      currency: this.config.currency,
      address: txData.specification.destination.address,
      amount: Numbers.toBigInt(txData.outcome.deliveredAmount.value),
      category: 'deposit',
      confirmations: txData.confirmations,
      status: 'confirmed',  // txs are already comfirmed by BC consensus
      createdAt: txData.createdAt ? txData.createdAt : undefined,
    }
  }

  isValidTx(tx, currency) {
    return (
      tx.type === 'payment' &&
      tx.outcome.result === 'tesSUCCESS'
    )
  }

  async clientStatus() {
    const blockHeight = await this.countBlocks()
    const lastChainBlock = await this.getBlock(blockHeight)

    return {
      blockHeight,
      connections: (await this.api.getServerInfo()).peers,
      lastBlockTime: Date.parse(lastChainBlock.parentCloseTime),
      lastChecked: Date.now(),
    }
  }

}
