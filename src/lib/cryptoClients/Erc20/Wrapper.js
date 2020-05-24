import debug from 'debug'
import Erc20Client from './Client'
import { Big } from '@cc-dev/math'
import Web3 from 'web3'
import erc20interface from "../../../res/TokenERC20-interface"

const log = debug('CCVault:Erc20:Wrapper')
const BN = Web3.utils.BN

export default class Erc20Wrapper {

  constructor(config, ethConfig) {
    this.config = config
    this.erc20Client = new Erc20Client(ethConfig)
    this.erc20Client.connect()
  }

  async generateAddress() {
    return this.erc20Client.generateAddress.apply(this.erc20Client, arguments)
  }

  async waitForTransactionConfirmation() {
    return this.erc20Client.waitForTransactionConfirmation.apply(this.erc20Client, arguments)
  }

  async countBlocks() {
    return this.erc20Client.countBlocks.apply(this.erc20Client, arguments)
  }

  async clientStatus() {
    return this.erc20Client.clientStatus()
  }

  getCurrencies() {
    return this.erc20Client.getCurrencies()
  }

  shouldMoveTokensToBank() {
    return this.erc20Client.getBank().moveTokensToBank === true
  }

  shouldMoveToColdStorage() {
    return this.erc20Client.shouldMoveToColdStorage()
  }

  getPollDelay() {
    return this.erc20Client.getPollDelay()
  }

  getBank() {
    return this.erc20Client.getTokensBank()
  }

  getColdStorageConfig() {
    return this.erc20Client.getColdStorageConfig()
  }

  getBankAddress() {
    return this.erc20Client.getTokensBankAddress()
  }

  getBankPK() {
    return this.erc20Client.getBankPK()
  }

  shouldMoveToBank() {
    return this.erc20Client.shouldMoveToBank()
  }

  getWalletConfig() {
    return this.erc20Client.getWalletConfig()
  }

  getWalletPassphrase() {
    return this.erc20Client.getWalletPassphrase()
  }

  getColdStorageMinBalance() {
    return this.erc20Client.getColdStorageMinBalance()
  }

  getColdStorageMaxBalance() {
    return this.erc20Client.getColdStorageMaxBalance()
  }

  getColdStorageAddress() {
    return this.erc20Client.getColdStorageAddress()
  }

  getMaxBlocksToProcess() {
    return this.erc20Client.getMaxBlocksToProcess()
  }

  getMinConfirmations() {
    return this.erc20Client.getMinConfirmations()
  }

  getTransactionFee() {
    return this.erc20Client.getTransactionFee()
  }

  async estimateSendTokensTransaction(fromAddress, toAddress, tokensAmount, convertToEth = true) {
    return this.erc20Client.estimateSendTokensTransaction(
      this.config.contract, fromAddress, toAddress, tokensAmount, convertToEth
    )
  }

  /**
   * Return token balance in absolute units as a string
   *
   * There are two possible tokens amount units: integer and absolute.
   * Integer tokens are what's the most useful for humans: 1 token == 1 integer token
   *
   * Absolute tokens depends on the token decimals - every token defines own precision
   * If a token contract defines `decimals = 5`, that means
   *   1 integer token = 100000 absolute tokens
   *   0.5 integer token = 50000 absolute tokens
   *
   * It's like ether and wei for ETH
   */
  async getBalance(address) {
    return await this.erc20Client.getTokenBalance(this.config.contract, address)
  }

  /**
   * Send tokens from the bank to an address
   * Expects amount in the integer unit
   */
  async sendToAddress(toAddress, integerAmount, fromAddress = this.getBankAddress(), opts = { minConfNr: 0 }) {
    return this.erc20Client.sendTokens(
      this.config.contract, fromAddress, toAddress,
      await this.integerToAbsolute(integerAmount),
      opts
    )
  }

  async getTokenPrecision() {
    return this.erc20Client.getTokenDecimals(this.config.contract)
  }

  async integerToAbsolute(amount) {
    return this.erc20Client.integerToAbsolute(this.config.contract, amount)
  }

  async absoluteToInteger(amount) {
    return this.erc20Client.absoluteToInteger(this.config.contract, amount)
  }

  async moveBalanceToBank(address) {
    log(`moveBalanceToBank(${address})`)
    const balance = await this.getBalance(address)
    log(`${await this.absoluteToInteger(balance)} tokens to transfer`)

    const estimate = await this.erc20Client.estimateSendTokensTransaction(
      this.config.contract, address, this.getBankAddress(), balance
    )
    const insufficientEth = await this.insufficientEthForTransaction(address, estimate)
    if(insufficientEth > 0) {
      log(`sending ${insufficientEth} ETH to a source wallet to make the tokens transaction happen`)
      const txHash = await this.erc20Client.sendToAddress(address, insufficientEth)
      await this.erc20Client.waitForTransactionConfirmation(txHash)
    }

    return this.erc20Client.sendTokens(
      this.config.contract,
      address,
      this.getBankAddress(),
      Web3.utils.toBN(balance),
      estimate
    )
  }

  async insufficientEthForTransaction(address, estimate) {
    const ethBalance = new Big(await this.erc20Client.getBalance(address))
    const txPrice = new Big(estimate.gas).times(new Big(estimate.gasPrice))
    log('transaction requires %s ETH and there is %s ETH available',
        this.erc20Client.weiToEther(txPrice), this.erc20Client.weiToEther(ethBalance))
    return this.erc20Client.weiToEther(txPrice.minus(ethBalance).toFixed())
  }

  isAddress(address) {
    return this.erc20Client.isAddress(address)
  }

}
