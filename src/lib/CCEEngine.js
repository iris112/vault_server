import { pick } from 'lodash'
import debug from 'debug'

const info = debug('CCVault:CCEEngine')

const RECEIVED_MESSAGE_KEYS = [
  'orders', 'orderMatches', 'walletUpdates', 'messageType',
]
const POLL_MESSAGE_WAIT_TIME = 20 // in seconds

// TODO: Maybe extract it a NPM package and share it with CCE ???
export default class CCEEngine {
  constructor(config, sqs) {
    this.messageBusInUrl = config.messageBusInUrl
    this.messageBusPollInterval = config.messageBusPollInterval || 0
    this.messageGroupId = config.messageGroupId
    this.sqs = sqs
  }

  async receiveMessage() {
    const params = {
      AttributeNames: [
        'MessageGroupId',
      ],
      MessageAttributeNames: [
        this.messageGroupId,
      ],
      QueueUrl: this.messageBusInUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: POLL_MESSAGE_WAIT_TIME,
    }

    const result = await this.sqs.receiveMessage(params).promise()

    if (result.Messages && result.Messages.length) {
      info('Received next message %o', result)
      return { ...result.Messages[0] }
    }

    return null
  }

  async deleteMessage(qMessage) {
    info('Deleting message %o', qMessage)

    const params = {
      QueueUrl: this.messageBusInUrl,
      ReceiptHandle: qMessage.ReceiptHandle,
    }

    return this.sqs.deleteMessage(params).promise()
  }

  parseQMessage(messageBody) {
    return pick(JSON.parse(messageBody), RECEIVED_MESSAGE_KEYS)
  }
}
