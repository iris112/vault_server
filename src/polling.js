import { Model } from 'objection'
import AWS from 'aws-sdk'
import Twilio from 'twilio'
import Logger from '@cc-dev/logger'
import { newKnex } from '@cc-dev/application'
import { Converter } from '@cc-dev/math'
import config from '../config'
import Deposits from './store/Deposits'
import Wallets from './store/Wallets'
import Addresses from './store/Addresses'
import Payments from './store/Payments'
import CryptoClientSettings from './store/CryptoClientSettings'
import CryptoClientHealth from './store/CryptoClientHealth'
import Cache from './store/Cache'
import pollCryptoDaemon from './workers/pollCryptoDaemon'
import CurrencySettings from './store/CurrencySettings'

new Logger(config).patchLoggers()

const app = {}
const knex = newKnex(config.mysql)

Model.knex(knex)

app.ROOT = process.cwd()
app.PROCESS_NAME = process.env.PROCESS_NAME
app.CURRENCY = process.env.CURRENCY
app.config = config
app.knex = knex
app.dynamo = new AWS.DynamoDB(config.aws.config)
app.Deposits = Deposits
app.Wallets = Wallets
app.Addresses = Addresses
app.Payments = Payments
app.CryptoClientSettings = new CryptoClientSettings(config, app.dynamo)
app.CryptoClientHealth = new CryptoClientHealth(config, app.dynamo)
app.Cache = new Cache(config, app.dynamo)
app.twilio = config.sms.enabled && Twilio(config.sms.accountSid, config.sms.authToken)

app.converter = new Converter()
// Initialize currency/unit conversion
app.CurrencySettings = new CurrencySettings(config, app.dynamo)
app.CurrencySettings.findAll().
  then(currencies => {
    app.converter.currencies = currencies
  })

pollCryptoDaemon(app)
  .catch(function(err){
    console.error(err)
    setTimeout(()=> { process.exit(1) }, 1000)
  })
