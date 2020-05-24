
export default async function bankBalance(ctx) {
  ctx.CURRENCY = 'btc'
  const client  = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  
  console.log('getting bank balance:')
  console.log(await client.getBalance(), 'btc')

  return Promise.resolve()
}