import debug from 'debug'
import { Joi } from '@cc-dev/validator'

const log = debug('CCVault:deploySmartContract')

export default deploySmartContract
async function deploySmartContract(ctx, next) {
  const { address, privateKey, totalSupply, name, symbol } = ctx.request.body

  let client = await ctx.CryptoClientSettings.getClient('eth')
  let receipt = await client.deploySmartContract(address, privateKey, totalSupply, name, symbol)

  // @TODO (Marci): remove after integration
  // -- receipt: { blockHash: '0xc02cc5755a8b62fb5aea523ff7c327a2e9c9ed91d97178999369a7e958d91e94', blockNumber: 2247360, contractAddress: '0xc3beE3924cf7b9C02F3390859563e93EdbA8E56C', cumulativeGasUsed: 6081299, from: '0xc6eb2f2f20e08be95ffbbf0facfcd5225b738e11', gasUsed: 777210, logs: [], logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000', status: true, to: null, transactionHash: '0x426fe8cb7633d3aa0eb33480edd71f031fc084f7b21e03710314f1312d01946a', transactionIndex: 39 }

  if(!receipt) {
    ctx.body = { error: { statusCode: 500, code: 'erc20DeplyomentFailed' } }
    ctx.status = 500

    return
  }

  // todo(Marci): Migrate logic from mysql to dynamo
  // ctx.ERC20Contracts does not exist anymore
  let contract = await ctx.ERC20Contracts.create({
    address: receipt.contractAddress,
    creator: receipt.from,
    txHash: receipt.transactionHash,
    name: name,
    symbol: symbol,
    totalSupply: totalSupply,
  })

  // @TODO (Marci): implement error checking after insertion

  ctx.body = { result: `> Deployed smart contract "${name}" [${symbol}] with total supply ${totalSupply} units. Contract Address: ${receipt.contractAddress}` }

  await next()
}

deploySmartContract.schema = {
  body: Joi.object().keys({
    totalSupply: Joi.number().integer().positive().min(1).required(),
    name: Joi.string().alphanum().min(3).max(30).required(),
    symbol: Joi.string().alphanum().min(3).max(9).required(),
    address: Joi.string().regex(/^(0x)?[0-9a-f]{40}$/i).required(),
    privateKey: Joi.any(), // @TODO (Marci): To remove, test only, this values needs to be taken from DB based on address
  }),
}
