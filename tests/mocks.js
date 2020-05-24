const CURRENCY_SETTINGS = [
  {
    numId: 2,
    currency: 'ltc',
    name: 'Litecoin',
    minWithdrawAmount: 1000000,
    maxWithdrawAmount: 100000000000000,
    withdrawalFee: 500000,
    liquidityProvider: 'binance',
    status: 'live'
  },
  {
    numId: 1,
    currency: 'btc',
    name: 'Bitcoin',
    minWithdrawAmount: 1000000,
    maxWithdrawAmount: 100000000000000,
    withdrawalFee: 500000,
    status: 'live'
  },
  {
    numId: 4,
    currency: 'xrp',
    name: 'Ripple',
    minWithdrawAmount: 1000000,
    maxWithdrawAmount: 100000000000000,
    withdrawalFee: 500000,
    status: 'live'
  },
  {
    numId: 3,
    currency: 'eth',
    name: 'Ethereum',
    minWithdrawAmount: 1000000,
    maxWithdrawAmount: 100000000000000,
    withdrawalFee: 500000,
    status: 'live'
  }
]

export class Binance {
  async withdraw() {
    return 'random-binanceId'
  }

  async listWithdrawals() {
    return [
      {
        id:'7213fea8e94b4a5593d507237e5a555b',
        amount: 1,
        address: '0x6915f16f8791d0a1cc2bf47c13a6b2a92000504b',
        asset: 'ETH',
        applyTime: 1508198532000,
        status: 'Cancelled',
      },
      {
        id:'4213fea8e94b4a5593d507237e5a111c',
        amount: 1,
        address: '0x6915f16f8791d0a1cc2bf47c13a6b2a92000504b',
        asset: 'ETH',
        txId: '0xdf33b22bdb2b28b1f75ccd201a4a4m6e7g83jy5fc5d5a9d1340961598cfcb0a1',
        applyTime: 1508198532000,
        status: 'Completed',
      },
    ]
  }
}

export async function seedCurrencySettings(app) {
  return app.CurrencySettings.add(CURRENCY_SETTINGS)
}

const deployTestingToken = (function () {
  let contract;

  return async function(app) {
    if(contract) return contract;

    const client = await app.CryptoClientSettings.getClient('erc20')
    const config = await app.CryptoClientSettings.findOne('eth')
    const receipt = await client.erc20Client.deployCustomSmartContract(
      'TST',
      config.contracts.author,
      config.contracts.privateKey
    )
    contract = receipt.contractAddress
    return contract
  }
})();

export async function seedERC20Token(app) {
  await app.CryptoClientSettings.add([{
    currency: 'tst',
    type: 'erc20_token',
    contract: await deployTestingToken(app)
  }])

  await app.CurrencySettings.add([{
    currency: 'tst',
    name: 'Test Standard Token',
    minWithdrawAmount: 1000000,
    maxWithdrawAmount: 100000000000000,
    withdrawalFee: 500000,
    status: 'live'
  }])
}
