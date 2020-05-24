import Web3         from 'web3'
import debug        from 'debug'
import crypto       from 'crypto'
import sleep        from 'await-sleep'
import { Numbers }  from '@cc-dev/math'
import CryptoClient from './CryptoClient'

const log = debug('CCVault:EthereumClient')

export default class EthereumClient extends CryptoClient {

  web3 = null

  /**
   * Opens the connection with the go ethereum (geth) client
   * This method must be called first in order to init the eth api
   */

  async connect() {
    const Web3Provider = this.config.client.protocol.startsWith('http:') ?
      Web3.providers.HttpProvider : Web3.providers.WebsocketProvider
    this.web3 = new Web3( new Web3Provider( this._provider() ))

    let networkId = await this.web3.eth.net.getId()
    log('>>> connected to geth client on network %s with id %d and host %s.', await this.getNetworkName(networkId), networkId, this._provider())
  }

  _provider() {
    return this.config.client.protocol + this.config.client.host + ':' + this.config.client.port
  }

  async getNetworkName(networkId) {
    switch (networkId) {
    case 1: return 'Frontier'
    case 2: return 'Morden'
    case 3: return 'Ropsten'
    case 4: return 'Rinkeby'
    default: return 'Unknown'
    }
  }

  async calculateWalletBalance() {
    const wei = this.getBankWeiBalance()
    const ether = this.weiToEther(wei)
    return ether
  }

  async getBankWeiBalance() {
    return this.getBalance(this.getBankAddress());
  }

  async getBalance(addr) {
    let balance = await this.web3.eth.getBalance(addr)
    return balance // in wei
  }

  isAddress(address) {
    return this.web3.utils.isAddress(address)
  }

  async calculateTxFee(fromAddress, toAddress, amountEth) {
    const web3 = this.web3
    const BN = web3.utils.BN
    const amountWei = this.etherToWei(amountEth)
    const gasPrice = new BN(await web3.eth.getGasPrice())
    const rawTx = { from: fromAddress, to: toAddress, value: amountWei}

    // Calculate estimated gas
    const estimatedGas = new BN(await web3.eth.estimateGas(rawTx))
    const fee = estimatedGas.mul(gasPrice)

    return this.weiToEther(fee)
  }

  /**
   * Generate public key on the blockchain
   * The private key is saved in a file with the Geth server
   * @returns {Promise<{public: *, private: *}>}
   */
  async generateAddress(withPrivateKey = false) {
    if(withPrivateKey) {
      // generates an eth public/private key pair
      let result = await this.web3.eth.accounts.create()
      return {
        public: result.address,
        private: result.privateKey,
      }
    }

    return {
      // generates an eth address using the password specified in client config
      public: await this.web3.eth.personal.newAccount(this.getWalletPassphrase()),
    }
  }

  async _sendEthPW(fromAddress, toAddress, ether, opts = { minConfNr: 0 } ) {
    return this._sendWeiPW(fromAddress, toAddress, this.etherToWei(ether), opts)
  }

  async _sendWeiPW(fromAddress, toAddress, wei, opts = { minConfNr: 0 } ) {
    log('> sendWeiPW(%O)', opts)
    const web3 = this.web3
    const BN = web3.utils.BN

    let tx = {
      from: fromAddress,
      to: toAddress,
      value: new BN(`${wei}`),
    }

    if(opts.estimatedGas) tx.gas      = opts.estimatedGas
    if(opts.gasPrice)     tx.gasPrice = opts.gasPrice

    if(tx.value.isNeg()) {
      throw new Error('Value is too low')
    }

    await web3.eth.personal.unlockAccount(fromAddress, this.getWalletPassphrase(), 60)

    return new Promise((resolve, reject) => {
      web3.eth.sendTransaction(tx)
      .on('error', (error) => {
        log('error', error)
        web3.eth.personal.lockAccount(fromAddress)
        return reject(error);
      })
      .on('transactionHash', (tx) => {
        log('txHash', tx)
        web3.eth.personal.lockAccount(fromAddress)
        if (!opts.minConfNr) {
          return resolve(tx)
        }
      })
      .on('confirmation', (number, receipt) => {
        if (opts.minConfNr) {
          log('%s confirmations out of %s...', number, opts.minConfNr)
          if (number >= opts.minConfNr) {
            log('transaction confirmed with receipt: ', receipt)
            return resolve(receipt)
          }
        }
      })
    })
  }

  // /**
  //  * Send ethereum via blockchain transaction
  //  * @param from
  //  * @param privateKey
  //  * @param to
  //  * @param amount
  //  * @returns {Promise<string>}
  //  */

  // async sendEthereumPK(from, privateKey, to, amount ) {
  //   const instance = this
  //   const web3 = this.web3
  //   const eth = web3.eth

  //   const gasPrice = await eth.getGasPrice()
  //   const gasPriceHex = web3.utils.toHex(gasPrice)
  //   const nonce = await eth.getTransactionCount(from)
  //   const nonceHex = web3.utils.toHex(nonce)
  //   const pk = new Buffer( instance.formatPK(privateKey), 'hex')

  //   const rawTx = {
  //     nonce: nonceHex,
  //     gasPrice: gasPriceHex,
  //     gasLimit: web3.utils.toHex(this.config.gasLimit),
  //     // data: transfer.encodeABI(),
  //     from: from,
  //     to: to,
  //     value: web3.utils.toHex( web3.utils.toWei(amount.toString(), 'ether') ),  // '0x0'
  //   }

  //   let tx = new Tx(rawTx)
  //   tx.sign(pk)
  //   let serializedTx = tx.serialize()

  //   return eth.sendSignedTransaction( '0x' + serializedTx.toString('hex'))
  //     .on('error', async function(error) {
  //       log('-- error: %o', error)
  //       return reject(error)
  //     })
  //     .on('transactionHash', function(transactionHash) {
  //       log('-- transactionHash: %o', transactionHash)
  //     })
  //     .on('receipt', function(receipt) {
  //       log('-- receipt: %o', receipt)
  //     })
  //     .on('confirmation', async function(confirmationNumber, receipt) {
  //       log('-- confirmation: %d', confirmationNumber)
  //       return receipt
  //     })
  // }

  toChecksumAddress(address) {
    if(address === null) {
      return ''
    }
    return this.web3.utils.toChecksumAddress(address)
  }

  /**
   *
   * @param blockHashOrBlockNumber
   * @returns {Promise<any>}
   */
  async getBlock(blockHashOrBlockNumber) {
    const web3 = this.web3
    const eth = web3.eth
    return new Promise((resolve, reject) => {
      eth.getBlock(blockHashOrBlockNumber , true , function(error, result){
        if(error) {
          log(error)
          return reject(error)
        }
        return resolve(result)
      })
    })
  }

  weiToEther(value) {
    return this.web3.utils.fromWei(value.toString(), 'ether')
  }

  etherToWei(value) {
    return this.web3.utils.toWei(value.toString())
  }

  /**
   * Ignore BC transactions that are not transfers
   * @param tx
   * @returns {boolean}
   */

  isValidTx(tx) {
    return(
      tx !== null &&
      tx.to !== null &&
      tx.value !== '0'
    )
  }

  /**
   * Formats the private key
   * @param key
   * @returns {*}
   */

  formatPK(key){
    if(key.startsWith('0x')) {
      return key.substr(2)
    }
    return key
  }

  calculateTransactionMetaUid(txData) {
    console.assert(txData.hash, 'txData.hash must be set.')

    return crypto.createHash('sha256')
      .update(`${this.config.currency}-${txData.hash}`)
      .digest('hex')
  }

  async countBlocks() {
    return (await this.getBlock('latest')).number
  }

  async findTransaction(txId, extraTxData = {}) {
    const transaction = await this.web3.eth.getTransaction(txId)
    // We need this routine to be more error-resilient for the staging area.
    // Ganache seems to "forget" transactions between restarts, and this would crash the poller
    if (!transaction) {
      log('warning: transaction data not found for txId #%s', txId)
      return null
    }
    return this._adaptSingleTransaction({ ...extraTxData, ...transaction })
  }

  async _adaptSingleTransaction(txData, totalBlockCount) {
    let category = txData.category
    totalBlockCount = totalBlockCount || await this.countBlocks()
    txData.confirmations = totalBlockCount - txData.blockNumber

    const status = category === 'withdrawal' || this.isConfirmedTransaction(txData) ? 'confirmed' : 'pending'
    const metaUid = this.calculateTransactionMetaUid(txData)
    let amount = Numbers.toBigInt(this.weiToEther(txData.value))
    let address = this.toChecksumAddress(txData.to)
    return {
      metaUid,
      txHash: txData.hash,
      txBlock: txData.blockNumber,
      currency: this.config.currency,
      address,
      amount,
      category: 'deposit',
      confirmations: txData.confirmations,
      status,
      createdAt: txData.createdAt ? txData.createdAt : undefined,
    }
  }

  async listTransactionsSinceBlock(blockIndex, maxBlockIndex) {
    let transactions = []
    const totalChainBlocks = await this.countBlocks()
    const totalBlocks = maxBlockIndex && maxBlockIndex < totalChainBlocks ? maxBlockIndex : totalChainBlocks

    log('listTransactionsSinceBlock totalBlocks %d, blockIndex %d', totalBlocks, blockIndex)
    while(blockIndex++ < totalBlocks) {
      log('block index ', blockIndex)
      // get next block to process:
      let block = await this.getBlock(blockIndex)
      log('processing block number %d of %d, with %d txs', block.number, totalBlocks, block.transactions.length)

      for(const tx of block.transactions){
        if(this.isValidTx(tx)) {
          tx.createdAt = block.timestamp * 1000 // add missing createdAt timestamp from block
          transactions.push(tx)
        }
      }
    }

    return this._adaptTransactions(transactions)
  }

  async clientStatus() {
    const blockHeight = await this.countBlocks()
    const lastChainBlock = await this.getBlock(blockHeight)

    return {
      blockHeight,
      connections: await this.web3.eth.net.getPeerCount(),
      lastBlockTime: lastChainBlock.timestamp * 1000,
      lastChecked: Date.now(),
    }
  }

  async moveBalanceToBank(fromAddress, opts = {}) {
    log(`moveBalanceToBank(${fromAddress}, %O)`, opts)
    console.assert(this.getBankAddress(), 'bank address is not set!')
    console.assert(this.getWalletPassphrase(), 'wallet passPhrase is not set!')

    const web3 = this.web3
    const BN = web3.utils.BN
    const fromBalance = await this.getBalance(fromAddress)
    const valueWei = new BN(fromBalance)
    const gasPrice = new BN(await web3.eth.getGasPrice())
    const rawTx = { from: fromAddress, to: this.getBankAddress(), value: valueWei}

    // Calculate estimated gas
    const estimatedGas = new BN(await web3.eth.estimateGas(rawTx))
    const fee = estimatedGas.mul(gasPrice)
    const toSend = valueWei.sub(fee)
    log('> tx fee: ', this.weiToEther(fee), ' etc')

    opts.gasPrice = gasPrice
    opts.estimatedGas = estimatedGas

    log(fromAddress, this.getBankAddress(), toSend, opts)
    return this._sendWeiPW(fromAddress, this.getBankAddress(), toSend, opts)
  }

  async sendToAddress(toAddress, ether, opts = {}) {
    log(`sendToAddress(${toAddress},${ether},%O`, opts)
    console.assert(this.getBankAddress(), 'bank address is not set!')
    console.assert(this.getWalletPassphrase(), 'wallet passPhrase is not set!')
    return this._sendEthPW(this.getBankAddress(), toAddress, ether, opts)
  }

  async waitForTransactionConfirmation(txHash, attempts = 120, attempt = 0) {
    const tx = await this.web3.eth.getTransaction(txHash)
    log(`waitForTransactionConfirmation txHash=${txHash} attempt=${attempt}/${attempts}`)
    if(tx.blockNumber || attempt >= attempts) {
      return true;
    }
    await sleep(1000)
    return await this.waitForTransactionConfirmation(txHash, attempts, attempt + 1)
  }
}
