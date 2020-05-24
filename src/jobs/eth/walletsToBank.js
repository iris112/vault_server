/**
 * Empty all accounts from the node, send the ETH to bank address
 *
 */

import debug from 'debug'
const log = debug('CCVault:job:etc/walletsToBank')

export default async function walletsToBank(ctx, check=true) {

  ctx.CURRENCY = 'eth'
  const client = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  const nodeAccounts = await client.web3.eth.getAccounts()
  const bankAddress = client.toChecksumAddress(client.config.wallet.bankAddress)

  for(const address of nodeAccounts) {
    const fromAddress = client.toChecksumAddress(address)

    if(fromAddress === bankAddress) continue

    const balance = await client.getBalance(fromAddress)
    log('account', fromAddress, client.weiToEther(balance))

    if(check !== 'false') continue

    const receipt = await client.moveBalanceToBank(fromAddress).catch((err)=>{log('error', err)})
  }
}