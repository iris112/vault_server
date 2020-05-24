import debug        from 'debug'
import { Api, JsonRpc, RpcError, JsSignatureProvider } from 'eosjs'
import fetch        from 'node-fetch'
import { TextDecoder, TextEncoder } from 'text-encoding'
import crypto       from 'crypto'
import { Numbers }  from '@cc-dev/math'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:xDacClient')

export default class xDacClient extends CryptoClient {

  constructor(config) {
    super(config)

    const connection = `${config.client.protocol}${config.client.host}` + (config.client.port ? `:${config.client.port}` : ``)
    console.log(config);
    this.bankSignatureProvider = new JsSignatureProvider([this.getBankPK()]);

    this.rpc = new JsonRpc(connection, { fetch })
    this.api = new Api({
      rpc: this.rpc,
      signatureProvider: this.bankSignatureProvider,
      textDecoder: new TextDecoder(),
      textEncoder: new TextEncoder()
    });

  }

  /**
   * Get actual bank balance
   * @returns {Promise.<string>}
   */
  async getBalance(account = this.getBankAddress()) {
    return parseFloat(await this.rpc.get_currency_balance('eosio.token', account, 'XDAC'))
  }

  async generateAddress() {

    const hrTime = process.hrtime()
    const stamp = Math.floor(hrTime[0] * 1000000 + hrTime[1] / 1000)+''

    return {
      public: `${this.getBank().accountName}.${stamp}`,
      private: stamp
    }
  }

  async sendToAddress(toAccount, amount, memo, fromAccount = this.getBank().accountName) {

    return this.api.transact({
      actions: [
        {
          account: 'eosio.token',
          name: 'transfer',
          authorization: [{
            actor: fromAccount,
            permission: 'active',
          }],
          data: {
            from: fromAccount,
            to: toAccount,
            quantity: `${amount.toFixed(4)} ${this.config.currency.toUpperCase()}`,
            memo: memo,
          },
        }
      ]
    }, {
      blocksBehind: 1,
      expireSeconds: 10,
    });
  }

  async moveBalanceToBank(fromAccount, fromPrivateKey) {

    // set private key of the user address
    this.api.signatureProvider = new JsSignatureProvider([fromPrivateKey]);
    const tx = await this.sendToAddress(this.getBankAddress(), await this.getBalance(fromAccount), 'bank', fromAccount)

    // restore bank private key
    this.api.signatureProvider = this.bankSignatureProvider

    return tx
  }

  async countBlocks() {
    let info = await this.rpc.get_info();
    this.lastChainBlock = await this.rpc.get_block(info.head_block_num);
    return info.head_block_num
  }

  async getBlock(height) {
    return this.rpc.get_block(height);
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData, 'txData must be set.')
    console.assert(txData.trx.id, 'txData.trx.id must be set.' + txData.block.block_num)
    console.assert(txData.action.hex_data, 'txData.action.hex_data must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.action.hex_data}-${txData.trx.id}`)
      .digest('hex')
  }

  isValidTransaction(transaction) {
    return transaction !== null && (typeof transaction.trx) == 'object' && transaction.status == 'executed'
  }

  isValidAction(action) {
    return action.name === 'transfer' && action.data.quantity.length && !isNaN(action.data.memo) && action.data.to === this.getBankAddress()
  }

  getBankAddress() {
    return this.getBank().accountName;
  }

  async findTransaction(txId, tx = {}) {

    const block = await this.getBlock(tx.txBlock)

    for(const transaction of block.transactions){
      if (this.isValidTransaction(transaction)) {
        for(const action of transaction.trx.transaction.actions){
          if (this.isValidAction(action)) {
            transaction.block = block;
            transaction.action = action;
            if (this.calculateTransactionMetaUid(transaction) === tx.metaUid) {
              return this._adaptSingleTransaction(transaction)
            }
          }
        }
      }
    }

  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {

    let transactions = []
    let totalBlocks = maxBlockIndex || await this.countBlocks()

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)
    while(blockIndex++ < totalBlocks) {

      let block = await this.getBlock(blockIndex)

      let blockTransactions = block.transactions
      log('processing block number %d of %d, with %d transactions', block.block_num, totalBlocks, blockTransactions.length)

      for(const transaction of blockTransactions){
        if (this.isValidTransaction(transaction)) {
          for(const action of transaction.trx.transaction.actions){
            if (this.isValidAction(action)) {
              transaction.block = block;
              transaction.action = action;
              transactions.push(transaction)
            }
          }
        }
      }
    }

    return this._adaptTransactions(transactions)
  }

  async _adaptSingleTransaction(transaction, totalBlockCount) {

    totalBlockCount = totalBlockCount || await this.countBlocks()

    let block = transaction.block
    let confirmations = totalBlockCount - block.block_num

    return {
      metaUid: this.calculateTransactionMetaUid(transaction),
      txHash: transaction.trx.id,
      txBlock: block.block_num,
      currency: this.config.currency,
      address: `${this.getBankAddress()}.${transaction.action.data.memo}`,
      amount: Numbers.toBigInt(parseFloat(transaction.action.data.quantity) * Math.pow(10, 8)),
      category: 'deposit',
      confirmations,
      status: confirmations > this.getMinConfirmations() ? 'confirmed' : 'pending',
      createdAt: block.timestamp ? Date.parse(block.timestamp) : undefined,
    }
  }

  async clientStatus() {

    const blockHeight = await this.countBlocks()

    return {
      blockHeight,
      connections: 'n/a',
      lastBlockTime: Date.parse(this.lastChainBlock.timestamp),
      lastChecked: Date.now(),
    }
  }

}
