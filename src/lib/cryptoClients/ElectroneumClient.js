import debug        from 'debug'
import crypto       from 'crypto'
import Monero       from 'monerojs'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:ElectroneumClient')

export default class ElectroneumClient extends CryptoClient {

  daemon
  wallet

  constructor(config) {
    super(config)
  }

  async getDaemon() {

    if (!this.daemon) {
      this.daemon = await new Monero.daemonRPC({ autoconnect: true, remote: true, protocol: this.config.client.daemon.protocol, port: this.config.client.daemon.port, hostname: this.config.client.daemon.host, network: 'testnet' })
    }

    return this.daemon
  }

  async getWallet() {

    if (!this.wallet) {
      this.wallet = await new Monero.walletRPC({ autoconnect: true, remote: true, protocol: this.config.client.wallet.protocol, port: this.config.client.wallet.port, hostname: this.config.client.wallet.host, network: 'testnet' })
    }

    return this.wallet
  }

  async getBalance(addressIndex) {

    const subAddresses = (await (await this.getWallet()).getbalance(this.getBank().accountIndex)).per_subaddress

    for(const subAddress of subAddresses) {
      if (subAddress.address_index == addressIndex) {
        return subAddress.unlocked_balance
      }
    }

    // if we can't find the address, means it doesnt hold any funds so is not populated thru the api
    return 0
  }

  async generateAddress() {

    const newAddress = await (await this.getWallet()).create_address()

    return {
      public: newAddress.address,
      private: newAddress.address_index + ''
    }
  }

  async sendToAddress(toPublicKey, amount) {
    return (await (await this.getWallet()).transfer(amount, toPublicKey))
  }

  async countBlocks() {
    this.lastChainBlock = (await (await this.getDaemon()).getlastblockheader()).block_header
    return this.lastChainBlock.height
  }

  async getBlock(height) {
    return (await (await this.getDaemon()).getblock_by_height(height));
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.txid, 'txData.txid must be set.')
    console.assert(txData.height, 'txData.height must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.txid}-${txData.height}`)
      .digest('hex')
  }

  async findTransaction(txId, tx = {}) {
    const transaction = (await (await this.getWallet()).get_transfer_by_txid(tx.txHash)).transfer
    if (this.isValidTransaction(transaction) && this.calculateTransactionMetaUid(transaction) === tx.metaUid) {
      return this._adaptSingleTransaction(transaction)
    }
  }

  async getAddresses() {
    return (await this.getWallet()).get_address();
  }

  isValidTransaction(transaction) {
    return transaction.type != 'block'
  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {

    let transactions = []
    let totalBlocks = maxBlockIndex || await this.countBlocks()
    const addresses = (await this.getAddresses()).addresses

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)

    for(const address of addresses) {
      let accountTransactions = (await (await this.getWallet()).get_transfers(['in'], this.getBank().accountIndex, address.address_index, blockIndex, maxBlockIndex)).in
      for(const transaction of accountTransactions) {
        if (this.isValidTransaction(transaction)) {
          transactions.push(transaction)
        }
      }
    }
    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(transaction, totalBlockCount) {

    return {
      metaUid: this.calculateTransactionMetaUid(transaction),
      txHash: transaction.txid,
      txBlock: transaction.height,
      currency: this.config.currency,
      address: transaction.address,
      amount: transaction.amount, // 10^-12
      category: 'deposit',
      confirmations: transaction.confirmations,
      status: transaction.confirmations > this.getMinConfirmations() ? 'confirmed' : 'pending',
      createdAt: transaction.timestamp,
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
