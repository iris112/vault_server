import debug from 'debug'
const log = debug('CCVault:job:eth/generateAddressPK')

export default async function generateAddressPK(ctx) {
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  const address = await ctx.cryptoClient.generateAddress(true)
  log(`Generated public key: ${address.public} with private key: ${address.private}`)

  return Promise.resolve()
}