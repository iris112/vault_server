import debug from 'debug'
const log = debug('CCVault:job:eth/sendEtherPW')

export default async function moveToBank(ctx, fromAddress) {
  console.assert(fromAddress, 'fromAddress is not set')
  
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  
  let balance = await ctx.cryptoClient.web3.eth.getBalance(fromAddress)

  return ctx.cryptoClient.moveBalanceToBank(fromAddress)
}
