import TestApp from './app'
import sleep from 'await-sleep'
import debug from 'debug'

const info = debug('CCVault:helpers')

export function skipUnlessCurrencyDefined(currency) {
  return async function() {
    const app = new TestApp()
    if(!await app.CryptoClientSettings.findOne(currency)) {
      // @see https://github.com/mochajs/mocha/issues/2819
      this.test.parent.pending = true;
      this.skip()
    }
  }
}

export async function waitUntil(body, condition, attempts = 60, attempt = 0) {
  const returnValue = await body()
  info(`waitUntil attempt=${attempt} returnValue=${returnValue}`)
  if(condition(returnValue) || attempt >= attempts) {
    return returnValue;
  }
  await sleep(1000)
  return await waitUntil(body, condition, attempts, attempt + 1)
}

/**
 * On Ganache there is no mining until a transaction is emit
 */
export async function causeEthBlockMined(client) {
  const { public: address } = await client.generateAddress()
  return await client.sendToAddress(address, 0.001)
}
