import debug from 'debug'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:createWalletWithBalance')

export default createWalletWithBalance
async function createWalletWithBalance(ctx, next) {
  const { userUid, currency } = ctx.request.body

  let wallet = await ctx.Wallets.findByUser(userUid, currency)
  if (!wallet) {
    await ctx.Wallets.create(ctx.request.body)
    wallet = await ctx.Wallets.findByUser(userUid, currency)
  }

  ctx.body = { result: { wallet } }

  await next()
}

createWalletWithBalance.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
    availableBalance: Joi.number().integer().min(0).optional().default(0),
    lockedBalance: Joi.number().integer().min(0).optional().default(0),
  }),
}

