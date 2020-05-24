import fs           from 'fs'
import crypto       from 'crypto'
import Client       from 'bitcoin-core'
import {isNumber}   from 'lodash'
import debug        from 'debug'
import { Numbers, Big } from '@cc-dev/math'
import CryptoClient from './CryptoClient'

const DEFAULT_TX_MIN_CONFIRMATIONS = 6
const DEFAULT_PASSPHRASE_TIMEOUT = 10

const log = debug('CCVault:BtcForkClient')

export default class BtcForkClient extends CryptoClient {

  constructor(config = {}) {
    super(config)
    this.config.minConfirmations = this.config.minConfirmations || DEFAULT_TX_MIN_CONFIRMATIONS
    if (this.config.client.sslCa) this.config.client.sslCa = this._loadCertificate(this.config.client.sslCa)
    this.client = new Client(this.config.client)
  }

  async chainInfo() {
    return this.client.getBlockchainInfo()
  }

  async walletInfo() {
    return this.client.getWalletInfo()
  }

  async networkInfo() {
    return this.client.getNetworkInfo()
  }

  async clientStatus() {
    const lastChainBlockHash = await this.findBestBlock()
    const lastChainBlock = await this.findBlock(lastChainBlockHash)
    const blockHeight = await this.countBlocks()
    const { connections } = await this.networkInfo()

    return {
      blockHeight, connections,
      lastBlockTime: lastChainBlock.time * 1000,
      lastChecked: Date.now(),
    }
  }

  async calculateRemainingBlocks() {
    const info = await this.getChainInfo()
    return info.headers - info.blocks
  }

  async findBestBlock() {
    return this.client.getBestBlockHash()
  }

  async countBlocks() {
    return this.client.getBlockCount()
  }

  async findBlock(hashOrIndex) {
    if (isNumber(hashOrIndex)) {
      hashOrIndex = await this.client.getBlockHash(hashOrIndex)
    }
    return this.client.getBlock(hashOrIndex)
  }

  async generateAddress() {
    await this.submitPassPhrase()
    return { public: await this.client.getNewAddress() }
  }

  async calculateWalletBalance() {
    return this.getBalance('*')
  }

  async getBalance(addr = '*') {
    return this.client.getBalance(addr)
  }

  async sendToAddress(address, amount) {
    await this.submitPassPhrase()
    return this.client.sendToAddress(address, amount)
  }

  async listTransactions(count = 100, from = 0, account = '*') {
    const transactions = await this.client.listTransactions(account, count, from)
    return this._adaptTransactions(transactions)
  }

  async listTransactionsSinceBlock(blockHashOrIndex) {
    if (!blockHashOrIndex) {
      return this.listTransactions()
    }
    if (isNumber(blockHashOrIndex)) {
      blockHashOrIndex = await this.client.getBlockHash(blockHashOrIndex)
    }
    const { transactions } = await this.client.listSinceBlock(blockHashOrIndex)
    return this._adaptTransactions(transactions)
  }

  // TODO: extraTxData is mostly needed for setting up the tx address from outside, check if it could be set from txData.details.
  async findTransaction(txId, extraTxData = {}) {
    const transaction = await this.client.getTransaction(txId)
    return this._adaptSingleTransaction({ ...extraTxData, ...transaction })
  }

  async submitPassPhrase() {
    if (!this.getWalletPassphrase()) return
    await this.client.walletPassphrase(this.getWalletPassphrase(), DEFAULT_PASSPHRASE_TIMEOUT)
  }

  // TODO: Test multisend, the transactions have the same txid, how to break them down one by one?
  calculateTransactionMetaUid(txData) {
    console.assert(txData.txid, 'txid must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.txid}`)
      .digest('hex')
  }

  async moveBalanceToBank(fromAddress) {
    log(`moveBalanceToBank(${fromAddress})`)

    if (!this.shouldMoveToBank()) return

    console.assert(this.getBankAddress(), 'bank address is not set!')
    console.assert(this.getWalletPassphrase(), 'wallet passPhrase is not set!')
    console.assert(this.getTransactionFee(), 'txFee is not set!')

    const totalBalance = await this.getBalance()
    const amountToSend = parseFloat(new Big(totalBalance).minus(new Big(this.getTransactionFee())).toString())
    if (amountToSend <= 0) {
      log('Nothing to move to bank...')

      return
    }
    log(`Moving ${amountToSend} ${this.config.currency} to bank address ${this.getBankAddress()}`)

    return this.sendToAddress(this.getBankAddress(), amountToSend)
  }

  _loadCertificate(path) {
    return fs.readFileSync(path)
  }

  _adaptTransactions(transactions = []) {
    return transactions.map((txData)=> this._adaptSingleTransaction(txData))
  }

  _adaptSingleTransaction(txData) {
    // Amount comes as negative for 'send' transactions
    const amount = txData.amount < 0 ? txData.amount * -1 : txData.amount

    // Match chain category with the API
    let category = txData.category
    if (category === 'receive') category = 'deposit'
    if (category === 'send') category = 'withdrawal'

    const status = category === 'withdrawal' || this.isConfirmedTransaction(txData) ? 'confirmed' : 'pending'
    const metaUid = this.calculateTransactionMetaUid(txData)

    return {
      metaUid,
      txHash: txData.txid,
      currency: this.config.currency,
      address: txData.address,
      amount: Numbers.toBigInt(amount),
      category,
      confirmations: txData.confirmations,
      status,
      createdAt: txData.timereceived * 1000,
    }
  }
}
