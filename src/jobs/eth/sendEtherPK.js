import Tx from 'ethereumjs-tx'
import debug from 'debug'
const log = debug('CCVault:job:eth/sendEtherPK')

export default async function sendEtherPK(ctx, fromAddress, fromPK, toAddress, amount = '0.0001', subtractFee = false) {
  ctx.CURRENCY = 'eth'
  ctx.cryptoClient = await ctx.CryptoClientSettings.getClient(ctx.CURRENCY)
  // const fromAddress = '0xc6eB2f2f20e08BE95FFBbf0fACfCd5225b738E11'
  // const fromPK = '0x282197277d78fbcfdb19935bc5021666e4436c491b87f6529729ff81033e6fcc'
  // const toAddress = '0x671520D094fe14bA2fee64a3C7353dcb33B966b8'
  // const amount = '0.01'

  // 0x671520D094fe14bA2fee64a3C7353dcb33B966b8

  // const fromAddress = '0x2b3f2AFD025006A05222812286e4c7EF0f6EA4C7'
  // const fromPK = '0x9e32e55aa1076b3103387ba09850ba349253bd62dac88aad598b2ece2ee1e680'
  // const toAddress = '0xc6eB2f2f20e08BE95FFBbf0fACfCd5225b738E11'

  const web3 = ctx.cryptoClient.web3
  const eth = web3.eth

  const gasPrice = await eth.getGasPrice()
  const gasPriceHex = web3.utils.toHex(gasPrice)
  const nonce = await eth.getTransactionCount(fromAddress)
  const nonceHex = web3.utils.toHex(nonce)
  const pk = new Buffer( ctx.cryptoClient.formatPK(fromPK), 'hex')

  const rawTx = {
    nonce: nonceHex,
    gasPrice: gasPriceHex,
    gasLimit: web3.utils.toHex(ctx.cryptoClient.config.gasLimit),
    // data: transfer.encodeABI(),
    from: fromAddress,
    to: toAddress,
    value: web3.utils.toHex( web3.utils.toWei(amount.toString(), 'ether') ),  // '0x0'
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
  return Promise.resolve()
}
