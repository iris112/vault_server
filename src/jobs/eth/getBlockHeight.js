
export default async function generateBlockHeight(ctx) {
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  const count = await ctx.cryptoClient.countBlocks()
  console.log('ETC block height: ' + count)
  return Promise.resolve()
}