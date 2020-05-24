import Tx from 'ethereumjs-tx'
import debug from 'debug'
const log = debug('CCVault:job:etc/sendEtherPK')

export default async function sendEtherPK(ctx, fromAddress = '0x0C7C81175C79fEa43dE333b99b6Ccd9Ebb5730e2', fromPK = '0xb3f96bf5197d7a3e0ee5bf94b66f36cd2ea1b9989de234116ee2102f99dce81d', toAddress = '0x237f3462CC24dFfDe246B510460C55FB58669137', ether = '0.011', subtractFee = false) {
  ctx.CURRENCY = 'etc'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)

  const web3 = ctx.cryptoClient.web3
  const eth = web3.eth

  const gasPrice = await eth.getGasPrice()
  const gasPriceHex = web3.utils.toHex(gasPrice)
  const nonce = await eth.getTransactionCount(fromAddress)
  const nonceHex = web3.utils.toHex(nonce)
  const pk = new Buffer( ctx.cryptoClient.formatPK(fromPK), 'hex')

  // Balance is 67.80172 etc.

  const rawTx = {
    nonce: nonceHex,
    gasPrice: gasPriceHex,
    gasLimit: web3.utils.toHex(ctx.cryptoClient.config.gasLimit),
    // data: transfer.encodeABI(),
    from: fromAddress,
    to: toAddress,
    value: web3.utils.toHex( web3.utils.toWei(ether, 'ether') ),  // '0x0'
  }

  let tx = new Tx(rawTx)
  tx.sign(pk)
  let serializedTx = tx.serialize()

  const receipt = await eth.sendSignedTransaction( '0x' + serializedTx.toString('hex'))
    .on('error', async function(error) {
      log('-- error: %o', error)
      throw error
    })
    .on('transactionHash', function(transactionHash) {
      log('-- transactionHash: %o', transactionHash)
    })
    .on('receipt', function(receipt) {
      log('-- receipt: %o', receipt)
    })
    .on('confirmation', async function(confirmationNumber, receipt) {
      log('-- confirmation: %d', confirmationNumber)
      return receipt
    })

  log(receipt)
  // return Promise.resolve()
}