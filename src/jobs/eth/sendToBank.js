import debug from 'debug'
const log = debug('CCVault:job:eth/sendEtherPW')

export default async function sendToBank(ctx, fromAddress) {
  console.assert(fromAddress, 'fromAddress is not set')

  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)

  const receipt = await ctx.cryptoClient.moveBalanceToBank(fromAddress)

  log("receipt", receipt)
}
