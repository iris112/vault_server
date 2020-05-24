import debug from 'debug'
const log = debug('CCVault:job:etc/generateAddressPW')

export default async function generateAddressPW(ctx) {
  ctx.CURRENCY = 'etc'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  const address = await ctx.cryptoClient.generateAddress()
  log(`Generated public key: ${address.public} with password: ${ctx.cryptoClient.config.wallet.passPhrase}`)

  return Promise.resolve()
}