import debug          from 'debug'
import { memoize }    from 'lodash'
import fs             from 'fs'
import { Big, Numbers } from '@cc-dev/math'
import abiDecoder     from 'abi-decoder'
import Tx             from 'ethereumjs-tx'
import EthereumClient from '../EthereumClient'
import erc20interface from '../../../res/TokenERC20-interface.json'
import solc           from 'solc'

const log = debug('CCVault:Erc20:Client')

export default class Erc20Client extends EthereumClient {

  constructor(config) {
    super(config)
    abiDecoder.addABI(erc20interface)
    this.getTokenDecimals = memoize(this._getTokenDecimals)
  }

  async _adaptSingleTransaction(txData, totalBlockCount) {
    // get the contract:
    let contract = this.getContractByAddress(this.toChecksumAddress(txData.to))
    if(!contract) return

    // get the to address and value:
    let decoded = this.decodeTokenTxInput(txData.input)
    if (!decoded) {
      log('Could not decode txData.input for contract %o: %o', contract, txData.input)
      return
    }

    decoded.value = await this.absoluteToInteger(contract.contract, decoded.value)

    // Match chain category with the API
    let category = txData.category

    // Calculate the number of confirmations
    totalBlockCount = totalBlockCount || await this.countBlocks()
    txData.confirmations = totalBlockCount - txData.blockNumber

    const status = category === 'withdrawal' || this.isConfirmedTransaction(txData) ? 'confirmed' : 'pending'
    const metaUid = this.calculateTransactionMetaUid(txData)

    // Amount comes as negative for 'send' transactions
    let amount = Numbers.toBigInt(decoded.value)
    let address = this.toChecksumAddress(decoded.to)

    return {
      metaUid,
      txHash: txData.hash,
      txBlock: txData.blockNumber,
      currency: contract.currency,
      address,
      amount,
      category: 'deposit',
      confirmations: txData.confirmations,
      status,
      createdAt: txData.createdAt ? txData.createdAt : undefined,
    }
  }

  async getTokenBalance(contractAddress, address) {
    const web3 = this.web3
    const contract = new web3.eth.Contract(erc20interface, contractAddress)
    return await contract.methods.balanceOf(address).call()
  }

  async _getTokenDecimals(contractAddress) {
    const web3 = this.web3
    const contract = new web3.eth.Contract(erc20interface, contractAddress)
    const decimals = await contract.methods.decimals().call()
    return parseInt(decimals);
  }

  async integerToAbsolute(contractAddress, amount) {
    const BN = this.web3.utils.BN
    return new BN(new Big(amount).times(await this._tokenDivider(contractAddress)).toFixed())
  }

  async absoluteToInteger(contractAddress, amount) {
    const BN = this.web3.utils.BN
    if(!BN.isBN(amount)) {
      amount = this.web3.utils.toBN(amount)
    }
    // have to use Big since bn.js doesn't support decimals
    return parseFloat(
      new Big(amount.toString()).div(await this._tokenDivider(contractAddress)).toFixed()
    )
  }

  async _tokenDivider(contractAddress) {
    return new Big(10).pow(await this.getTokenDecimals(contractAddress))
  }

  /**
   * Send tokens via the contract method
   * @param contractAddress
   * @param from
   * @param to
   * @param amount - in absolute token units
   * @returns {Promise<string>}
   */

  async sendTokens(contractAddress, from, to, amount, opts = { minConfNr: 0 }) {
    log(`sendTokens(${contractAddress}, ${from}, ${to}, ${amount}, %O`, opts)
    const web3 = this.web3
    if(!web3.utils.isBN(amount)) {
      throw new Error('amount for sendTokens() should be an instance of BN, ' +
                      `but ${typeof amount} given`)
    }
    const eth = web3.eth
    const contract = new eth.Contract(erc20interface, contractAddress)

    await web3.eth.personal.unlockAccount(from, this.getWalletPassphrase(), 60)

    return new Promise((resolve, reject) => {
      opts = Object.assign({}, opts, { from })
      log('transfer method with %O params', opts)
      contract.methods.transfer(to, web3.utils.toHex(amount)).send(opts)
        .on('error', (error) => {
          log('error', error)
          web3.eth.personal.lockAccount(from)
          return reject(error);
        })
        .on('transactionHash', (tx) => {
          log('txHash', tx)
          web3.eth.personal.lockAccount(from)
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

  /**
   * Return {gas, gasPrice} for a transfer tokens transaction
   *
   * @param contractAddress
   * @param from
   * @param to
   * @param amount - in absolute token units
   * @param convertToEth - return an ETH amount or gas and gasPrice as object
   * @returns {Promise<{gas: integer, gasPrice: integer}>}
   */
  async estimateSendTokensTransaction(contractAddress, from, to, amount, convertToEth = false) {
    const contract = new this.web3.eth.Contract(erc20interface, contractAddress)
    const gas =
      await contract.methods.transfer(to, this.web3.utils.toHex(amount)).estimateGas({ from })
    const gasPrice = await this.web3.eth.getGasPrice()
    log(`estimateSendTokensTransaction(${contractAddress}, ${from}, ${to}, ${amount}): %O`,
        {gas, gasPrice})

    if (convertToEth) {
      const BN = this.web3.utils.BN
      return this.weiToEther(new BN(gas).mul(new BN(gasPrice)))
    }

    return {gas, gasPrice}
  }

  /**
   * Deploys the smart contract to the blockchain
   * @param account
   * @param privateKey
   * @param initialSupply
   * @param name
   * @param symbol
   * @returns {Promise<string>}
   */

  async deploySmartContract(account, privateKey, initialSupply, name, symbol) {
    return await this.deployCustomSmartContract("TokenERC20", account, privateKey,
                                                [ initialSupply, name, symbol ])
  }

  async deployCustomSmartContract(source, account, privateKey, args = []) {
    const instance = this
    const web3 = this.web3
    const eth = web3.eth

    return new Promise(async(resolve, reject) => {
      const gasPrice = await eth.getGasPrice()
      const gasPriceHex = web3.utils.toHex(gasPrice)
      const nonce = await eth.getTransactionCount( account )
      const nonceHex = web3.utils.toHex(nonce)
      const pk = Buffer.from( instance.formatPK(privateKey), 'hex')

      // Contract byteCode
      const contractByteCode = fs.readFileSync(`src/res/${source}-bytecode.dat`, 'utf8')
      const contractInterface = require(`../../../res/${source}-interface.json`)

      // Create contract
      let contract = new eth.Contract(contractInterface, null, { data: contractByteCode })

      // Init contract deploy
      let contractDeploy = await contract.deploy({ arguments: args })

      // Get estimated gas
      const estimatedGas = await contractDeploy.estimateGas()

      const rawTx = {
        nonce: nonceHex,
        gasPrice: gasPriceHex,
        gasLimit: web3.utils.toHex( estimatedGas + 10000 ),
        data: contractDeploy.encodeABI(),
      }

      let tx = new Tx(rawTx)
      tx.sign(pk)

      const serializedTx = tx.serialize()

      let receipt = await eth.sendSignedTransaction( '0x' + serializedTx.toString('hex'))
        .on('error', function(error){
          log('-- error: %o', error)
          return reject(error)
        })
        .on('transactionHash', function(transactionHash){
          log('-- transactionHash: %o', transactionHash)
        })
        .on('receipt', function(receipt){
          log('-- receipt: %o', receipt) // contains the new contract address
        })
        .on('confirmation', async function(confirmationNumber, receipt){
          log('-- confirmation ' + confirmationNumber)

          if(confirmationNumber === instance.getMinConfirmations()) {
            log('-- receipt: %o', receipt)
            return resolve(receipt)
          }
        })

      // log('== receipt: %o', receipt)
    })
  }

  /**
   * Compiles the solidity smart contract code
   * and generates the bytecode and json interface
   * @param sourcePath
   * @returns {Promise<void>}
   */

  async compile(sourcePath) {
    const source = fs.readFileSync(sourcePath, 'utf8')
    let output = solc.compile(source, 1)
    log(output.contracts)
  }

  /**
   * Ignore BC transactions that are not transfers
   * @param t
   * @returns {boolean}
   */

  isValidTx(t, currency) {
    return (
      t !== null &&
      t.to !== null
    )
  }

  /**
   * Decodes and returns the tx.input params
   * @param input
   * @returns {value: in ether, to: address}
   */

  decodeTokenTxInput(input) {
    const decodedData = abiDecoder.decodeMethod(input)

    if(this.isValidData(decodedData)) {
      return {
        // sometimes it returns a number in the scientific notation, such as 5e+21
        // BN fails to ingest it, so we utilize big.js
        value: new Big(decodedData.params[1].value).toFixed(),
        to: decodedData.params[0].value,
      }
    }
    return null
  }

  isValidData(decodedData) {
    return (decodedData && decodedData.name === 'transfer' && decodedData.params.length >= 2 &&
      decodedData.params[0].name === '_to'    && decodedData.params[0].type === 'address' &&
      decodedData.params[1].name === '_value' && decodedData.params[1].type === 'uint256')
  }

  getCurrencies() {
    return this.config.tokens.map( token => token.currency )
  }

  getContractByAddress(contractAddr) {
    for(const token of this.config.tokens) {
      if (this.toChecksumAddress(token.contract) === this.toChecksumAddress(contractAddr)) {
        return token
      }
    }

    return null
  }

  getTokensBankAddress() {
    return this.getBank('tokensPublicKey')
  }
}
