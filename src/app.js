import AWS from 'aws-sdk'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import cors from 'koa-cors'
import helmet from 'koa-helmet'
import { Model } from 'objection'
import Logger from '@cc-dev/logger'
import { newKnex } from '@cc-dev/application'
import { Binance } from '@cc-dev/liquidity'
import { Converter } from '@cc-dev/math'
import config from '../config'
import Deposits from './store/Deposits'
import Wallets from './store/Wallets'
import Addresses from './store/Addresses'
import Payments from './store/Payments'
import CryptoClientSettings from './store/CryptoClientSettings'
import CryptoClientHealth from './store/CryptoClientHealth'
import CurrencySettings from './store/CurrencySettings'
import Cache from './store/Cache'
import MarketAccounts from './store/MarketAccounts'
import routes from './routes'

new Logger(config).patchLoggers()

const app = new Koa()
const knex = newKnex(config.mysql)

Model.knex(knex)

app.proxy = true
app.context.ROOT = process.cwd()
app.context.config = config
app.context.kms = new AWS.KMS(config.aws.config)
app.context.knex = knex
app.context.dynamo = new AWS.DynamoDB(config.aws.config)
app.context.binance = new Binance(config.binance)
app.context.Deposits = Deposits
app.context.Payments = Payments
app.context.Wallets = Wallets
app.context.Addresses = Addresses
app.context.MarketAccounts = MarketAccounts
app.context.CryptoClientSettings = new CryptoClientSettings(config, app.context.dynamo)
app.context.CryptoClientHealth = new CryptoClientHealth(config, app.context.dynamo)
app.context.Cache = new Cache(config, app.context.dynamo)
app.context.CurrencySettings = new CurrencySettings(config, app.context.dynamo)

app.context.converter = new Converter()
// Initialize currency/unit conversion
app.context.CurrencySettings.findAll().
  then(currencies => {
    app.context.converter.currencies = currencies
  })

app.use(helmet())
app.use(cors())
app.use(bodyParser())
app.use(routes)

app.on('error', (err, ctx) => {
  console.error(err)
})

app.listen(app.context.config.app.port)

export default app
