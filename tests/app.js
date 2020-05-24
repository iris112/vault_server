import AWS from 'aws-sdk'
import { Model } from 'objection'
import { newKnex, resetDynamoDb } from '@cc-dev/application'
import Ganache from 'ganache-cli'
import config from '../config'
import CryptoClientSettings from '../src/store/CryptoClientSettings'
import Cache from '../src/store/Cache'
import Wallets from '../src/store/Wallets'
import Addresses from '../src/store/Addresses'
import Payments from '../src/store/Payments'
import CryptoClientHealth from '../src/store/CryptoClientHealth'
import CurrencySettings from '../src/store/CurrencySettings'
import Deposits from '../src/store/Deposits'
import MarketAccounts from '../src/store/MarketAccounts'
import MarketTransactions from '../src/store/MarketTransactions'
import * as mocks from './mocks'

const ROOT = process.cwd()
const ganacheServer = Ganache.server(config.ganache)
const knex = newKnex(config.mysql)

Model.knex(knex)

export default class TestApp {
  constructor() {
    this.ROOT = ROOT
    this.config = config
    this.knex = knex
    this.kms = new AWS.KMS(config.aws.config)
    this.dynamo = new AWS.DynamoDB(config.aws.dynamo.config)
    this.binance = new mocks.Binance()
    this.Deposits = Deposits
    this.MarketAccounts = MarketAccounts
    this.MarketTransactions = MarketTransactions
    this.Wallets = Wallets
    this.Addresses = Addresses
    this.Payments = Payments
    this.CryptoClientSettings = new CryptoClientSettings(this.config, this.dynamo)
    this.CryptoClientHealth = new CryptoClientHealth(this.config, this.dynamo)
    this.Cache = new Cache(this.config, this.dynamo)
    this.CurrencySettings = new CurrencySettings(this.config, this.dynamo)
    this.body = null
    this.request = {
      query: {},
      body: {},
      headers: {},
    }
    this.mockNext = async() => Promise.resolve()
  }
}

before(async() => {
  const app = new TestApp()
  await resetDynamoDb(app, 'CryptoClientSettingsTable')
  await resetDynamoDb(app, 'CryptoClientHealthTable')
  await resetDynamoDb(app, 'CacheTable')
  await resetDynamoDb(app, 'CurrencySettingsTable')
  ganacheServer.listen(config.ganache.port, (err)=> {
    if (err) throw err
  })
})

after(async() => {
  ganacheServer.close()
})

beforeEach(async() => {
  const app = new TestApp()
  await app.knex.table('Deposits').truncate()
  await app.knex.table('Addresses').del()
  await app.knex.table('Wallets').del()
  await app.knex.table('Payments').truncate()
  await app.knex.table('MarketTransactions').truncate()
  await app.knex.table('MarketAccounts').truncate()
  await resetDynamoDb(app, 'CryptoClientSettingsTable')
  await resetDynamoDb(app, 'CryptoClientHealthTable')
  await resetDynamoDb(app, 'CacheTable')
  await resetDynamoDb(app, 'CurrencySettingsTable')
  if(app.config.cryptoClientSettings.length) {
    await app.CryptoClientSettings.add(app.config.cryptoClientSettings)
  }
  await mocks.seedCurrencySettings(app)
})
