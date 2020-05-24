import AWS from 'aws-sdk'
import { Model } from 'objection'
import Logger from '@cc-dev/logger'
import { newKnex } from '@cc-dev/application'
import config from '../config'
import Wallets from './store/Wallets'
import Cache from './store/Cache'
import CCEEngine from './lib/CCEEngine'
import pollMessageBus from './workers/pollMessageBus'

new Logger(config).patchLoggers()

const app = { context: {} }
const knex = newKnex(config.mysql)

Model.knex(knex)

app.ROOT = process.cwd()
app.context.config = config
app.context.sqs = new AWS.SQS(config.aws.config)
app.context.cceEngine = new CCEEngine(config.cceEngine, app.context.sqs)
app.context.knex = knex
app.context.dynamo = new AWS.DynamoDB(config.aws.config)
app.context.Wallets = Wallets
app.context.Cache = new Cache(config, app.context.dynamo)

pollMessageBus(app.context, async() => {})
  .catch(function(err){
    console.error(err)
    setTimeout(()=> { process.exit(1) }, 1000)
  })

