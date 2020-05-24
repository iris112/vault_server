import debug from 'debug'
const log = debug('CCVault:job:eth/sendEtherPW')

export default async function sendEtherPW(ctx, fromAddress, toAddress, ether = '0.0001', subtractFee = false) {
  console.assert(fromAddress, 'fromAddress is not set')
  console.assert(toAddress, 'toAddress is not set')
  console.assert(ether, 'ether is not set')
  
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  
  return ctx.cryptoClient._sendEthPW(fromAddress, toAddress, ether.toString())
}
