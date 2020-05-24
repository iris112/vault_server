import AWS from 'aws-sdk'
import debug from 'debug'

const info = debug('CCVault:Cache')

export default class Cache {

  constructor(config, dynamo) {
    this.tableName = config.aws.dynamo.Cache.tableName
    this.docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })
  }

  async add(key, value) {
    await this.docClient.put({
      TableName: this.tableName,
      Item: {
        cacheKey: key,
        value,
      },
    }).promise()

    return { key, value }
  }

  async get(cacheKey) {
    const result = await this.docClient.get({
      TableName: this.tableName,
      Key: { cacheKey },
    }).promise()

    return result.Item ? result.Item.value : null
  }
}
