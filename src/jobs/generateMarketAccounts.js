export default async function generateMarketAccounts(ctx, limit=100) {
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getMarketClient() // eth lib with market config

  let index = limit
  while(index-- > 0) {
    const newAccount = await ctx.cryptoClient.generateAddress()
    const accountData = {
      address: newAccount.public,
      balance: 0,
      currency: ctx.CURRENCY,
    }
    console.log('created account with index ' + (limit - index))
    await ctx.MarketAccounts.create(accountData)
  }

  console.log(`created ${limit} ${ctx.CURRENCY} accounts.`)

  return Promise.resolve()
}
