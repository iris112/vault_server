import path from 'path'
import fs from 'fs'
import AWS from 'aws-sdk'
import {Model} from 'objection'
import { newKnex } from '@cc-dev/application'
import config from '../config'
import MarketAccounts from './store/MarketAccounts'
import CryptoClientSettings from './store/CryptoClientSettings'

const JOB_NAME = process.argv[2]
const JOB_OPTS = process.argv.slice(3)
const JOB_FILE_PATH = path.join(process.cwd(), `src/jobs/${JOB_NAME}.js`)

if (!fs.existsSync(JOB_FILE_PATH)) {
  console.error(`Unknown task ${JOB_NAME}.`)
  process.exit(1)
}

const job = require(JOB_FILE_PATH)

const knex = newKnex(config.mysql)

Model.knex(knex)

const app = {
  ROOT: process.cwd(),
}
app.config = config
app.knex = knex
app.dynamo = new AWS.DynamoDB(config.aws.config)
app.MarketAccounts = MarketAccounts
app.CryptoClientSettings = new CryptoClientSettings(config, app.dynamo)

job(app, ...JOB_OPTS)
  .then(()=> process.exit())
  .catch((err)=> {
    console.error(`Error running task ${JOB_NAME}: `, err)
    setTimeout(()=> { process.exit(1) }, 1000)
  })
