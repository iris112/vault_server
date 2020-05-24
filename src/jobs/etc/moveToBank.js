import debug from 'debug'
const log = debug('CCVault:job:etc/moveToBank')

export default async function moveToBank(ctx, fromAddress) {
  console.assert(fromAddress, 'fromAddress is not set')
  
  ctx.CURRENCY = 'etc'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  
  return ctx.cryptoClient.moveBalanceToBank(fromAddress)
}
