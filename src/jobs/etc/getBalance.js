
export default async function getBalance(ctx, address = '0x0C7C81175C79fEa43dE333b99b6Ccd9Ebb5730e2') {
  ctx.CURRENCY = 'etc'
  ctx.client = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  const balance = await ctx.client.getBalance(address)
  console.log('Balance is ' + ctx.client.weiToEther(balance) + ' etc.')
  return Promise.resolve()
}