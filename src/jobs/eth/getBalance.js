
export default async function getBalance(ctx, address = '0xC5beC20e97fCE752c54Ed9D901cbE0a9361b1B06') {
  ctx.CURRENCY = 'eth'
  ctx.client = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  
  const balance = await ctx.client.getBalance(address)

  console.log('Balance is ' + ctx.client.weiToEther(balance) + ' eth.')
  
  return Promise.resolve()
}