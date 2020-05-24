import { Model } from 'objection'
import { pick } from 'lodash'
import * as constants from '../constants'

export default class MarketTransactions extends Model {
  static tableName = 'MarketTransactions'

  static jsonSchema = {
    type: 'object',
    required: [
      'currency', 'address', 'confirmations',
      'amount', 'txHash',
    ],
    properties: {
      marketTransactionId: { type: 'integer' },
      txHash: {
        type: 'string',
      },
      currency: {
        type: 'string',
      },
      address: {
        type: 'string',
      },
      amount: {
        type: 'integer',
      },
      confirmations: {
        type: 'integer',
      },
      amountWasLoaded: {
        type: 'boolean',
      },
      status: {
        type: 'string',
        enum: constants.DEPOSIT_STATUSES,
      },
      createdAt: { type: 'integer' },
      updatedAt: { type: 'integer' },
    },
  }

  shouldLoadWalletDeposit() {
    return !this.amountWasLoaded && this.status === 'confirmed'
  }

  static async findByTxHash(txHash, opts = {}) {
    const query = this.query(opts.transaction)
      .where('txHash', txHash)
      .first()
    opts.forUpdate && query.forUpdate()

    return query
  }

  static async findAll(filter = {}, opts = {}) {
    const query = this.query(opts.transaction)
      .where(filter)
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async create(data, opts = {}) {
    const transactionData = Object.assign({}, data)
    await this.query(opts.transaction).insert(transactionData)

    return this.findByTxHash(transactionData.txHash, opts)
  }

  static async update(txHash, data, opts = {}) {
    const updateData = { ...data }

    await this.query(opts.transaction)
      .patch(updateData)
      .where('txHash', txHash)

    return this.findByTxHash(txHash, opts)
  }

  static async setAmountLoaded(txHash, opts = {}) {
    // Avoid loading the wallet balance multiple times,
    // use opts.forUpdate:true on MySQL transaction init to lock the table.
    opts.forUpdate = true
    const chainTransaction = await this.findByTxHash(txHash, opts)
    if (chainTransaction.amountWasLoaded) {
      throw new Error(`ChainTransaction amount for ${txHash} already set as loaded!`)
    }

    await this.query(opts.transaction)
      .patch({ amountWasLoaded: true })
      .where({ txHash })

    return this.findByTxHash(txHash, opts)
  }

  static async createOrUpdateByTxHash(data, opts = {}) {
    const tx = await MarketTransactions.findByTxHash(data.txHash, opts)
    const txData = pick(data, [
      'txHash', 'address', 'currency', 'amount',
      'confirmations', 'status',
    ])
    if (!tx) {
      return MarketTransactions.create(txData, opts)
    }
    return MarketTransactions.update(tx.txHash, txData, opts)
  }

  async $beforeInsert() {
    if (!this.createdAt) this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }

  async $beforeUpdate() {
    this.updatedAt = Date.now()
  }
}
