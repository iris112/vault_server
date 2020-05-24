import debug from 'debug'
import { Big } from '@cc-dev/math'
const log = debug('CCVault:job:eth/sendTokens')

const TX_FEE_SAFE_MULTIPLIER = 3

export default async function sendTokens(ctx, currency, fromAddress, bankAddress, tokensAmount) {
  console.assert(currency, 'currency is not set')
  console.assert(fromAddress, 'fromAddress is not set')
  console.assert(bankAddress, 'bankAddress is not set')

  const ethCryptoClient = await ctx.CryptoClientSettings.getClient('eth')
  const tokensCryptoClient = await ctx.CryptoClientSettings.getClient(currency)

  tokensAmount = parseFloat(tokensAmount, 10) || ethCryptoClient.weiToEther(await tokensCryptoClient.getBalance(fromAddress))
  log('Full token amount to collect from %s: %s %s', fromAddress, tokensAmount, currency)

  if (parseFloat(tokensAmount) === 0) {
    log('Nothing to collect from %s', fromAddress)
    return
  }

  let tokenTxFee = await tokensCryptoClient.estimateSendTokensTransaction(
    fromAddress, bankAddress, ethCryptoClient.etherToWei(tokensAmount)
  )
  // Increase the transaction fee since it might fluctuate at the time of execution
  tokenTxFee = parseFloat(new Big(tokenTxFee).mul(TX_FEE_SAFE_MULTIPLIER).toString())
  log('Transaction fee to collect tokens: %s eth', tokenTxFee)

  const tokenAddressEthBalance = ethCryptoClient.weiToEther(await ethCryptoClient.getBalance(fromAddress))

  if (tokenAddressEthBalance < tokenTxFee) {
    const balanceDiff = parseFloat(new Big(tokenTxFee).sub(new Big(tokenAddressEthBalance)).toString())
    log('Not enough ETH balance on %s need %s more', fromAddress, balanceDiff)
    log('Sending %s ETH to %s from %s to cover token tx fee', balanceDiff, fromAddress, bankAddress)
    await ethCryptoClient._sendEthPW(bankAddress, fromAddress, balanceDiff, { minConfNr: 1 })
  } else {
    log('Enough balance %s ETH on %s to send tokens with %s ETH fee', tokenAddressEthBalance, fromAddress, tokenTxFee)
  }

  log('Sending %s %s from %s to %s', tokensAmount, currency, fromAddress, bankAddress)
  await tokensCryptoClient.sendToAddress(bankAddress, tokensAmount, fromAddress, { minConfNr: 1 })
}
