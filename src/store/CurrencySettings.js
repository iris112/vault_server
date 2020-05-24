import AWS from 'aws-sdk'
import { memoize, cloneDeep } from 'lodash'
import debug from 'debug'

const CACHE_INTERVAL_MINUTES = 5

const info = debug('CCVault:CurrencySettings')

export default class CurrencySettings {

  constructor(config, dynamo) {
    this.tableName = config.aws.dynamo.CurrencySettings.tableName
    this.docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })
    this._findAllCached = memoize(this._findAll)
  }

  async add(currencySettings = []) {
    const puts = []
    for (const item of currencySettings) {
      puts.push({
        PutRequest: {
          Item: item,
        },
      })
    }
    return this.docClient.batchWrite({
      RequestItems: {
        [this.tableName]: puts
      },
    }).promise()
  }

  async findOne(currency) {
    const result = await this.docClient.get({
      TableName: this.tableName,
      Key: { currency },
    }).promise()

    return result.Item
  }

  async findAll() {
    return cloneDeep(await this._findAllCached(CurrencySettings.calculateCacheKey()))
  }

  async _findAll(cacheKey) {
    info('_findAll cache miss with cacheKey %o', cacheKey)

    const res = await this.docClient.scan({
      TableName: this.tableName,
    }).promise()

    return res.Items
  }

  static calculateCacheKey() {
    const now = Date.now()
    const timeAgo = now - (now % (1000 * 60 * CACHE_INTERVAL_MINUTES))
    return new Date(timeAgo).toISOString()
  }
}
