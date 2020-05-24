import debug from 'debug'
import {pick} from 'lodash'
import { Joi } from '@cc-dev/validator'
import * as constants from '../../constants'

const info = debug('CCVault:listDeposits')

export default listDeposits
async function listDeposits(ctx, next) {
  const filter = pick(ctx.request.body, ['userUid', 'currency', 'status'])
  const opts = pick(ctx.request.body, ['page', 'limit'])

  const deposits = await ctx.Deposits.findAll(filter, opts)
  const counters = await ctx.Deposits.countAll(filter)

  ctx.body = {
    result: {
      deposits,
      total: counters[0].total,
    },
  }

  await next()
}

listDeposits.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
    status: Joi.any().valid(constants.DEPOSIT_STATUSES).optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(25).optional().default(10),
  }),
}

listDeposits.schemaAdmin = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid().optional(),
    currency: Joi.string().optional(),
    status: Joi.any().valid(constants.DEPOSIT_STATUSES).optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(25).optional().default(10),
  }),
}

listDeposits.publicViews = {
  list: async (ctx, next) => {
    ctx.body.result.deposits = ctx.body.result.deposits.map((tx)=> pick(tx, [
      'metaUid', 'userUid', 'currency', 'txHash',
      'address', 'amount', 'confirmations', 'amountWasLoaded',
      'status', 'createdAt', 'updatedAt',
    ]))

    await next()
  },
}
