import should from 'should'
import TestApp from '../../app'
import generateMarketAccounts from '../../../src/jobs/generateMarketAccounts'

describe.skip('generateMarketAccounts', async() => {

  it('generates market deposit addresses', async () => {
    const app = new TestApp()

    await generateMarketAccounts(app, 'test', 5)
    const accounts = await app.MarketAccounts.findAll()

    should(accounts.length).eql(5)
  })

})
