
export default async function bankBalance(ctx) {
  ctx.CURRENCY = 'eth'
  const client  = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  
  console.log('getting bank balance:')
  console.log(await client.getBalance(), 'wei')
  console.log(client.weiToEther(await client.getBalance()), 'ether')

  return Promise.resolve()
}