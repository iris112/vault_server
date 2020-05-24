import debug from 'debug'
import {pick} from 'lodash'
import { Joi } from '@cc-dev/validator'
import * as constants from '../../constants'

const info = debug('CCVault:listPayments')

export default listPayments
async function listPayments(ctx, next) {
  const filter = pick(ctx.request.body, ['userUid', 'currency', 'status'])
  const opts = pick(ctx.request.body, ['page', 'limit'])

  const payments = await ctx.Payments.findAll(filter, opts)
  const counters = await ctx.Payments.countAll(filter)

  ctx.body = {
    result: {
      payments: payments,
      total: counters[0].total,
    },
  }

  await next()
}

listPayments.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string().optional(),
    status: Joi.any().valid(constants.PAYMENT_STATUSES).optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(25).optional().default(10),
  }),
}

listPayments.schemaAdmin = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid().optional(),
    currency: Joi.string().optional(),
    status: Joi.any().valid(constants.PAYMENT_STATUSES).optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(25).optional().default(10),
  }),
}

listPayments.publicViews = {
  list: async (ctx, next) => {
    ctx.body.result.payments = ctx.body.result.payments.map((tx)=> pick(tx.toJSON(), [
      'paymentUid', 'userUid', 'currency', 'address', 'amount',
      'fee', 'finalAmount', 'txHash', 'status', 'createdAt', 'updatedAt',
    ]))

    await next()
  },
}
