import AWS                      from 'aws-sdk'
import { memoize, cloneDeep }   from 'lodash'
import debug                    from 'debug'
import BtcForkClient            from '../lib/cryptoClients/BtcForkClient'
import MoneroClient             from '../lib/cryptoClients/MoneroClient'
import ElectroneumClient        from '../lib/cryptoClients/ElectroneumClient'
import EthereumClient           from '../lib/cryptoClients/EthereumClient'
import Erc20Wrapper             from '../lib/cryptoClients/Erc20/Wrapper'
import Erc20Deposits            from '../lib/cryptoClients/Erc20/Deposits'
import EthereumClassicClient    from '../lib/cryptoClients/EthereumClassicClient'
import RippleClient             from '../lib/cryptoClients/RippleClient'
import NeoClient                from '../lib/cryptoClients/NeoClient'
import TronClient               from '../lib/cryptoClients/TronClient'
// import CardanoClient            from '../lib/cryptoClients/CardanoClient'
import EosClient                from '../lib/cryptoClients/EosClient'
import NemClient                from '../lib/cryptoClients/NemClient'
import xDacClient                from '../lib/cryptoClients/xDacClient'
import StellarClient            from '../lib/cryptoClients/StellarClient'
import * as constants           from '../constants'

const CACHE_INTERVAL_MINUTES = 5

const info = debug('CCVault:CryptoClientSettings')

export default class CryptoClientSettings {

  constructor(config, dynamo) {
    this.tableName = config.aws.dynamo.CryptoClientSettings.tableName
    this.docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })
    this._findAllCached = memoize(this._findAll)
    this.getClient = memoize(this._getClient)
  }

  async add(clientSettings = []) {
    const puts = []
    for (const item of clientSettings) {
      puts.push({
        PutRequest: {
          Item: item,
        },
      })
    }
    return this.docClient.batchWrite({
      RequestItems: {
        [this.tableName]: puts
      },
    }).promise()
  }

  async findAll(cache = true) {
    if (!cache) {
      return this._findAll('noCache')
    }
    return cloneDeep(await this._findAllCached(CryptoClientSettings.calculateCacheKey()))
  }

  async _findAll(cacheKey) {
    info('_findAll cache miss with cacheKey %o', cacheKey)

    const res = await this.docClient.scan({
      TableName: this.tableName,
    }).promise()

    return res.Items
  }

  async findOne(symbol) {
    const clients = await this.findAll()
    const clientsSettings = clients.find((cl)=> cl.currency === symbol)

    return clientsSettings ? { ...clientsSettings } : null
  }

  async _getClient(symbol) {
    info('_getClient cache miss with %o', symbol)

    if(symbol === 'erc20') {
      return await Erc20Deposits.init(await this.findOne('eth'), this)
    }

    const clientConfig = await this.findOne(symbol)

    if (clientConfig.currency === 'xmr') { // monero, keep it before BTC_FORKED_CURRENCIES check
      return new MoneroClient(clientConfig)
    } else if (clientConfig.currency === 'etn') {
      return new ElectroneumClient(clientConfig)
    } else if (clientConfig.currency === 'trx') {
      return new TronClient(clientConfig)
    } else if (clientConfig.currency === 'ada') {
      // return new CardanoClient(clientConfig)
    } else if (constants.BTC_FORKED_CURRENCIES.includes(clientConfig.currency)) { // bitcoin based coins
      return new BtcForkClient(clientConfig)
    } else if (clientConfig.currency === 'xrp') { // ripple
      const client = new RippleClient(clientConfig)
      await client.connect() // connect after instantiation
      return client
    } else if (clientConfig.currency === 'eth') { // ethereum
      const client = new EthereumClient(clientConfig)
      await client.connect()
      return client
    } else if (clientConfig.currency === 'etc') { // ethereum classic
      const client = new EthereumClassicClient(clientConfig)
      await client.connect()
      return client
    } else if (clientConfig.currency === 'neo') { // neo
      return new NeoClient(clientConfig)
    } else if (clientConfig.currency === 'xlm') { // stellar lumen
      return new StellarClient(clientConfig)
    } else if (clientConfig.currency === 'eos') { // eos
      return new EosClient(clientConfig)
    } else if (clientConfig.currency === 'xdac') { // xdac
      return new xDacClient(clientConfig)
    } else if (clientConfig.currency === 'xem') {
      return new NemClient(clientConfig)
    } else if (clientConfig.type === 'erc20_token') {
      return new Erc20Wrapper(clientConfig, await this.findOne('eth'))
    }

    throw new Error(`Client not found for symbol ${symbol}`)
  }

  async getMarketClient() {
    const result = await this.docClient.get({
      TableName: this.tableName,
      Key: { currency: 'marketEth' },
    }).promise()
    console.assert(result.Item, 'Market client settings must be set')

    const client = new EthereumClient({ ...result.Item, currency: 'eth', })
    await client.connect()
    return client
  }

  async getCurrencies() {
    const clients = await this.findAll()
    return clients.map( cl => cl.currency)
  }

  async getERC20Tokens() {
    const clients = await this.findAll()
    return clients.filter( cl => cl.type === 'erc20_token' )
  }

  static calculateCacheKey() {
    const now = Date.now()
    const timeAgo = now - (now % (1000 * 60 * CACHE_INTERVAL_MINUTES))
    return new Date(timeAgo).toISOString()
  }
}
