import AWS from 'aws-sdk'

export default class CryptoClientHealth {

  constructor(config, dynamo) {
    this.tableName = config.aws.dynamo.CryptoClientHealth.tableName
    this.docClient = new AWS.DynamoDB.DocumentClient({ service: dynamo })
  }

  async updateClientStatus(currency, clientStats = {}) {
    const clientStatus = CryptoClientHealth.calculateStatus(clientStats)

    return this.docClient.update({
      TableName: this.tableName,
      Key: {
        currency,
      },
      UpdateExpression: 'set blockHeight = :blockHeight,' +
      'connections = :connections,' +
      'lastBlockTime = :lastBlockTime,' +
      'lastChecked = :lastChecked,' +
      'clientStatus = :clientStatus',
      ExpressionAttributeValues: {
        ':blockHeight': clientStats.blockHeight,
        ':connections': clientStats.connections,
        ':lastBlockTime': clientStats.lastBlockTime,
        ':lastChecked': clientStats.lastChecked,
        ':clientStatus': clientStatus,
      },
    }).promise()
  }

  async findAll() {
    const res = await this.docClient.scan({
      TableName: this.tableName,
    }).promise()

    return res.Items
  }

  async findOne(symbol) {
    const clients = await this.findAll()
    const clientHealth = clients.find((cl)=> cl.currency === symbol)

    return clientHealth ? { ...clientHealth } : null
  }

  static calculateStatus(clientStats) {
    console.assert(clientStats.lastBlockTime, 'lastBlockTime is required.')
    console.assert(clientStats.lastChecked, 'lastChecked is required.')

    const timeDiffMinutes = parseInt((clientStats.lastChecked - clientStats.lastBlockTime) / 1000 / 60)

    if (timeDiffMinutes < 30) {
      return 'normal'
    } else if (timeDiffMinutes < 60) {
      return 'delayed'
    }  else {
      return 'blocked'
    }
  }
}
