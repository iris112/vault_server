import debug from 'debug'
const log = debug('CCVault:job:etc/sendEtherPW')

export default async function sendEtherPW(ctx, fromAddress, toAddress, ether = '0.0001', subtractFee = false) {
  console.assert(fromAddress, 'fromAddress is not set')
  console.assert(toAddress, 'toAddress is not set')
  console.assert(ether, 'ether is not set')
  
  ctx.CURRENCY = 'etc'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY) // eth lib with market config

  return ctx.cryptoClient.sendEthereumPW(fromAddress, toAddress, ether.toString(), {subtractFee})
}
