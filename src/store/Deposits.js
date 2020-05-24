import { Model } from 'objection'
import { isArray } from 'lodash'
import * as constants from '../constants'

export default class Deposits extends Model {
  static tableName = 'Deposits'

  static jsonSchema = {
    type: 'object',
    required: [
      'metaUid', 'currency', 'address', 'confirmations',
      'amount', 'txHash',
    ],
    properties: {
      depositId: { type: 'integer' },
      metaUid: {
        type: 'string',
        pattern: '[A-Fa-f0-9]{64}',
      },
      userUid: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
      },
      txHash: {
        type: 'string',
      },
      txBlock: {
        type: 'integer',
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

  static async findByUid(metaUid, opts = {}) {
    const query = this.query(opts.transaction)
      .where('metaUid', metaUid)
      .first()
    opts.forUpdate && query.forUpdate()

    return query
  }

  static async findByTxHash(txHash, opts = {}) {
    const query = this.query(opts.transaction)
      .where('txHash', txHash)
      .first()
    opts.forUpdate && query.forUpdate()

    return query
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
      .count('depositId as total')
  }

  static async create(data, opts = {}) {
    var args={}
    if(!Number.isInteger(data.confirmations))
      args.confirmations=1;
    const depositData = Object.assign({}, data, args
      // {
      // TODO: Think about generating metaUid here
      // metaUid: sha256(...),
    // }
    )
    await this.query(opts.transaction).insert(depositData)

    return this.findByUid(depositData.metaUid, opts)
  }

  static async update(metaUid, data, opts = {}) {
    const updateData = { ...data }

    await this.query(opts.transaction)
      .patch(updateData)
      .where('metaUid', metaUid)

    return this.findByUid(metaUid, opts)
  }

  static async setAmountLoaded(metaUid, opts = {}) {
    // Avoid loading the wallet balance multiple times,
    // use opts.forUpdate:true on MySQL transaction init to lock the table.
    opts.forUpdate = true
    const deposit = await this.findByUid(metaUid, opts)
    if (deposit.amountWasLoaded) {
      throw new Error(`Deposit amount for ${metaUid} already set as loaded!`)
    }

    await this.query(opts.transaction)
      .patch({ amountWasLoaded: true })
      .where('metaUid', metaUid)

    return this.findByUid(metaUid, opts)
  }

  static async createOrUpdateByUid(data, opts = {}) {
    const tx = await Deposits.findByUid(data.metaUid, opts)
    if (!tx) {
      return Deposits.create(data, opts)
    }
    return Deposits.update(tx.metaUid, data, opts)
  }

  async $beforeInsert() {
    if (!this.createdAt) this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }

  async $beforeUpdate() {
    this.updatedAt = Date.now()
  }

  /**
   * Update balance info
   *
   * @param {Converter} converter
   * @param deposit
   * @param wallet
   * @param opts
   * @returns {Promise<void>}
   */
  static async updateBalanceInfo(converter, deposit, wallet, opts = {}) {
    try {
      // This balance info is being stored for debugging purposes only
      let balanceCurrency = wallet.currency
      let availableBalance = converter.toFloatSingle(wallet.availableBalance, balanceCurrency)
      let lockedBalance = converter.toFloatSingle(wallet.lockedBalance, balanceCurrency)
      await Deposits.update(deposit.metaUid, {
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
