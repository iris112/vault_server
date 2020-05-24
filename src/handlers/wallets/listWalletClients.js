import debug from 'debug'
import { sortBy, pick } from 'lodash'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:listWalletClients')

export default listWalletClients
async function listWalletClients(ctx, next) {
  const { page, limit } = ctx.request.body
  const skip = (page -1) * limit

  const clients = sortBy(await ctx.CryptoClientHealth.findAll(), 'currency')
  const pagedClients = clients.slice(skip, skip + limit)

  ctx.body = { result: { clients: pagedClients, total: clients.length } }

  await next()
}

listWalletClients.schema = {
  body: Joi.object().keys({
    page: Joi.number().integer().min(1).optional().default(1),
    limit: Joi.number().integer().min(1).max(100).optional().default(25),
  }),
}

listWalletClients.publicViews = {
  list: async (ctx, next) => {
    ctx.body.result.clients = ctx.body.result.clients.map((client)=> pick(client, [
      'currency', 'blockHeight', 'clientStatus', 'connections',
      'lastBlockTime', 'lastChecked',
    ]))

    await next()
  },
}
