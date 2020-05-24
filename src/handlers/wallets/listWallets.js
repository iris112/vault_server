import debug from 'debug'
import {pick} from 'lodash'
import { Joi } from '@cc-dev/validator'
import * as constants from '../../constants'

const info = debug('CCVault:listWallets')

export default listWallets
async function listWallets(ctx, next) {
  const filter = pick(ctx.request.body, ['userUid', 'currency'])
  const opts = pick(ctx.request.body, ['page', 'limit', 'sortBy', 'sortDir'])

  const wallets = await ctx.Wallets.findAll(filter, opts)
  const counters = await ctx.Wallets.countAll(filter)

  ctx.body = { result: { wallets, total: counters[0].total } }

  await next()
}

listWallets.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.array().single().optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(25).optional().default(10),
    sortBy: Joi.any().valid(constants.WALLETS_SORT_BY_KEYS).optional(),
    sortDir: Joi.any().valid('asc', 'desc').optional(),
  }),
}

listWallets.schemaAdmin = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid().optional(),
    currency: Joi.array().single().optional(),
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(25).optional().default(10),
    sortBy: Joi.any().valid(constants.WALLETS_SORT_BY_KEYS).optional(),
    sortDir: Joi.any().valid('asc', 'desc').optional(),
  }),
}
