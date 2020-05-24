import debug from 'debug'
import {pick} from 'lodash'
import { Joi } from '@cc-dev/validator'

const info = debug('CCVault:getWallet')

export default getWallet
async function getWallet(ctx, next) {
  const { userUid, currency } = ctx.request.body

  const wallet = await ctx.Wallets.findByUser(userUid, currency)
  if (!wallet) {
    ctx.body = { error: { statusCode: 404, code: 'walletNotFound' } }
    ctx.status = 404

    return
  }

  ctx.body = { result: { wallet } }

  await next()
}

getWallet.schema = {
  body: Joi.object().keys({
    userUid: Joi.string().uuid(),
    currency: Joi.string(),
  }),
}

getWallet.publicViews = {
  details: async (ctx, next) => {
    ctx.body.result.wallet = pick(ctx.body.result.wallet, [
      'walletUid', 'userUid', 'currency', 'availableBalance',
      'lockedBalance', 'addresses', 'createdAt', 'updatedAt',
    ])
    ctx.body.result.wallet.addresses = ctx.body.result.wallet.addresses.map((item)=> item.address)

    await next()
  },
  list: async (ctx, next) => {
    ctx.body.result.wallets = ctx.body.result.wallets.map((wallet)=> {
      wallet = pick(wallet, [
        'walletUid', 'userUid', 'currency', 'availableBalance',
        'lockedBalance', 'addresses', 'createdAt', 'updatedAt',
      ])
      wallet.addresses = wallet.addresses.map((item)=> item.address)

      return wallet
    })

    await next()
  },
}
