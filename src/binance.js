import { Model } from 'objection'
import Logger from '@cc-dev/logger'
import { newKnex } from '@cc-dev/application'
import { Binance } from '@cc-dev/liquidity'
import config from '../config'
import Wallets from './store/Wallets'
import Payments from './store/Payments'
import pollBinanceWithdrawals from './workers/pollBinanceWithdrawals'

new Logger(config).patchLoggers()

const app = {}
const knex = newKnex(config.mysql)

Model.knex(knex)

app.ROOT = process.cwd()
app.PROCESS_NAME = process.env.PROCESS_NAME
app.config = config
app.binance = new Binance(config.binance)
app.knex = knex
app.Payments = Payments
app.Wallets = Wallets

pollBinanceWithdrawals(app)
  .catch(function(err){
    console.error(err)
    setTimeout(()=> { process.exit(1) }, 1000)
  })
