import uuid           from 'uuid'
import { isArray }    from 'lodash'
import { Model }      from 'objection'
import { Big }        from '@cc-dev/math'
import * as constants from '../constants'

export default class Payments extends Model {
  static tableName = 'Payments'

  static jsonSchema = {
    type: 'object',
    required: [
      'paymentUid', 'userUid', 'currency', 'address', 'amount',
    ],
    properties: {
      paymentId: { type: 'integer' },
      paymentUid: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
      },
      userUid: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
      },
      binanceId: { type: 'string' },
      currency: {
        type: 'string',
      },
      address: {
        type: 'string',
      },
      amount: {
        type: 'integer',
      },
      fee: {
        type: 'integer',
      },
      txHash: {
        type: 'string',
      },
      status: {
        type: 'string',
        enum: constants.PAYMENT_STATUSES,
      },
      createdAt: { type: 'integer' },
      updatedAt: { type: 'integer' },
    },
  }

  static virtualAttributes = [
    'finalAmount',
  ]

  finalAmount() {
    return parseInt(
      new Big(this.amount).minus(new Big(this.fee)).toString()
    )
  }

  static async findByUid(paymentUid, opts = {}) {
    const query = this.query(opts.transaction)
      .where('paymentUid', paymentUid)
      .first()
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async findByBinanceId(binanceId, opts = {}) {
    const query = this.query(opts.transaction)
      .where('binanceId', binanceId)
      .first()
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async findByTxHash(txHash, opts = {}) {
    return this.query(opts.transaction)
      .where('txHash', txHash)
      .first()
  }

  static async findAll(filter, opts = {}) {
    opts.limit = opts.limit || 10
    opts.page = opts.page || 1
    const offset = (opts.page - 1) * opts.limit
    const query = this.query(opts.transaction)

    // Allow search by multiple currencies for erc20 tokens
    if (filter.currency && isArray(filter.currency)) {
      query.whereIn('currency', filter.currency)
      delete filter.currency
    }

    return query.where(filter)
      .limit(opts.limit)
      .offset(offset)
  }

  static async countAll(filter, opts = {}) {
    const query = this.query(opts.transaction)

    // Allow search by multiple currencies for erc20 tokens
    if (filter.currency && isArray(filter.currency)) {
      query.whereIn('currency', filter.currency)
      delete filter.currency
    }

    return query.where(filter)
      .count('paymentId as total')
  }

  static async create(data, opts = {}) {
    const paymentData = Object.assign({}, data, {
      paymentUid: uuid(),
    })
    return this.query(opts.transaction).insert(paymentData)
  }

  static async update(paymentUid, data, opts = {}) {
    const updateData = { ...data }

    await this.query(opts.transaction)
      .patch(updateData)
      .where('paymentUid', paymentUid)

    return this.findByUid(paymentUid, opts)
  }

  async $beforeInsert() {
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }

  async $beforeUpdate() {
    this.updatedAt = Date.now()
  }

  /**
   * Update balance info
   *
   * @param {Converter} converter
   * @param payment
   * @param wallet
   * @param opts
   * @returns {Promise<void>}
   */
  static async updateBalanceInfo(converter, payment, wallet, opts = {}) {
    try {
      // This balance info is being stored for debugging purposes only
      let balanceCurrency = wallet.currency
      let availableBalance = converter.toFloatSingle(wallet.availableBalance, balanceCurrency)
      let lockedBalance = converter.toFloatSingle(wallet.lockedBalance, balanceCurrency)
      await Payments.update(payment.paymentUid, {
        availableBalance,
        lockedBalance,
        balanceCurrency,
      }, opts)
    } catch(e) {
      // In case of failure, do not rollback anything since this info is for debugging purposes
      console.warn(e)
    }
  }
}
