import fetch      from 'node-fetch'
import debug      from 'debug'

const error = debug('CCVault:CryptoClient:error')
const log = debug('CCVault:CryptoClient:log')

export default class CryptoClient {

  constructor(config) {
    this.config = config
    log('> Loaded config: %O', config)
  }

  getCurrencies() {
    return this.config.currency
  }

  isConfirmedTransaction(tx = {}) {
    return tx.confirmations >= this.config.minConfirmations
  }

  async _adaptTransactions(transactions = []) {
    const totalBlockCount = await this.countBlocks()
    let adaptedTransactions = []
    for (const txData of transactions) {
      const adaptedTx = await this._adaptSingleTransaction(txData, totalBlockCount)

      if(adaptedTx) {
        adaptedTransactions.push(adaptedTx)
      }
    }
    return adaptedTransactions
  }

  async _callRpc(connection, method, params) {
    const { host, port, path }  = connection || this.config.client
    const requestUrl = `http://${host}:${port}/${path}`
    const body = JSON.stringify({ jsonrpc: '2.0', id: '0', method, params })
    const headers = { 'Content-Type': 'application/json' }

    const response = await fetch(requestUrl, { body, headers, method: 'post' })

    if (!response.ok) {
      const err = await response.text()
      error(err)
      throw new Error(err)
    }

    const jsonResponse = await response.json()

    if (jsonResponse.error) {
      throw new Error(JSON.stringify(jsonResponse.error))
    }

    return { ...jsonResponse.result }
  }

  getBank(key = undefined) {
    const bank = this.config.bank || {};
    return key ? bank[key] : bank
  }

  getColdStorageConfig() {
    return this.config.coldStorage || {}
  }

  getBankAddress() {
    return this.getBank().publicKey
  }

  getBankPK() {
    return this.getBank().privateKey
  }

  shouldMoveToBank() {
    return this.getBank().moveToBank === true
  }

  getWalletConfig() {
    return this.config.wallet || {}
  }

  getBankPassphrase() {
    return this.config.bank.passPhrase
  }

  getWalletPassphrase() {
    return this.getWalletConfig().passPhrase
  }

  shouldMoveToColdStorage() {
    return this.getColdStorageConfig().enabled === true
  }

  getColdStorageMinBalance() {
    return this.getColdStorageConfig().minBalance
  }

  getColdStorageMaxBalance() {
    return this.getColdStorageConfig().maxBalance
  }

  getColdStorageAddress() {
    return this.getColdStorageConfig().publicKey
  }

  getMaxBlocksToProcess() {
    return this.config.maxBlocksToProcess
  }

  getPollDelay() {
    return this.config.pollDelay
  }

  getMinConfirmations() {
    return this.config.minConfirmations
  }

  getTransactionFee() {
    return this.config.txFee
  }

  async moveBalanceToBank(fromAddress) {}

  async getBalance(publicKey) {}

  async countBlocks() {}

  async clientStatus() {}

  async generateAddress() {}

  async findTransaction() {}

  async calculateTransactionMetaUid(txData) {}

}
