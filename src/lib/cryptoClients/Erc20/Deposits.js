import debug from 'debug'
import Erc20Client from './Client'

const log = debug('CCVault:Erc20:Deposits')

export default class Erc20Deposits {

  static async init(config, cryptoClientSettings) {
    config.tokens = await cryptoClientSettings.getERC20Tokens()
    return new this(config, cryptoClientSettings)
  }

  constructor(ethConfig, cryptoClientSettings) {
    this.config = ethConfig
    this.cryptoClientSettings = cryptoClientSettings
    this.erc20Client = new Erc20Client(ethConfig)
    this.erc20Client.connect()
  }

  async clientStatus() {
    return this.erc20Client.clientStatus()
  }

  async countBlocks() {
    return this.erc20Client.countBlocks()
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
    return this.erc20Client.getBank()
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

  async listTransactionsSinceBlock() {
    const transactions =
          await this.erc20Client.listTransactionsSinceBlock.apply(this.erc20Client, arguments)
    return transactions
  }

  async moveBalanceToBank(fromAddress, address) {
    if (!this.shouldMoveTokensToBank()) {
      return
    }
    const client = await this.cryptoClientSettings.getClient(address.currency)
    return await client.moveBalanceToBank(fromAddress)
  }

  async findTransaction() {
    return this.erc20Client.findTransaction.apply(this.erc20Client, arguments)
  }
}
