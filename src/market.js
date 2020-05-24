import { Model } from 'objection'
import AWS from 'aws-sdk'
import Logger from '@cc-dev/logger'
import { newKnex } from '@cc-dev/application'
import config from '../config'
import CryptoClientSettings from './store/CryptoClientSettings'
import MarketAccounts from './store/MarketAccounts'
import MarketTransactions from './store/MarketTransactions'
import Cache from './store/Cache'
import pollMarketTransactions from './workers/pollMarketTransactions'

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
// TODO: Hack, staging config to connect to staging SQS
app.sqs = new AWS.SQS(config.aws.marketConfig || config.aws.config)
app.MarketAccounts = MarketAccounts
app.MarketTransactions = MarketTransactions
app.CryptoClientSettings = new CryptoClientSettings(config, app.dynamo)
app.Cache = new Cache(config, app.dynamo)

pollMarketTransactions(app)
  .catch(function(err){
    console.error(err)
    setTimeout(()=> { process.exit(1) }, 1000)
  })
