import uuid from 'uuid'
import { Model } from 'objection'
import { pick } from 'lodash'
import { Big }  from '@cc-dev/math'
import * as constants from '../constants'

export default class Wallets extends Model {
  static tableName = 'Wallets'

  static get relationMappings() {
    const Addresses = require('./Addresses')
    return {
      addresses: {
        relation: Model.HasManyRelation,
        modelClass: Addresses,
        join: {
          from: 'Wallets.walletId',
          to: 'Addresses.walletId',
        },
      },
    }
  }

  static jsonSchema = {
    type: 'object',
    required: [
      'walletUid', 'userUid', 'currency',
    ],
    properties: {
      walletId: { type: 'integer' },
      walletUid: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
      },
      userUid: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
      },
      currency: {
        type: 'string',
      },
      availableBalance: {
        type: 'integer',
      },
      lockedBalance: {
        type: 'integer',
      },
      createdAt: { type: 'integer' },
      updatedAt: { type: 'integer' },
    },
  }

  static async findByUid(walletUid, opts = {}) {
    const query = this.query(opts.transaction)
      .where('walletUid', walletUid)
      .eager('addresses')
      .first()
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async findByUser(userUid, currency, opts = {}) {
    const query = this.query(opts.transaction)
      .where({ userUid, currency })
      .eager('addresses')
      .first()
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async findAll(filter, opts = {}) {
    opts.limit = opts.limit || 10
    opts.page = opts.page || 1
    opts.sortBy = opts.sortBy || 'currency'
    opts.sortDir = opts.sortDir || 'asc'
    const offset = (opts.page - 1) * opts.limit

    const query = this.query(opts.transaction)
    filter = await this.buildSearchFilter(filter)
    if (filter.currency) {
      query.whereIn('currency', [ ...filter.currency ])
      delete filter.currency
    }
    opts.forUpdate && query.forUpdate()

    return query
      .where(filter)
      .eager('addresses')
      .limit(opts.limit)
      .offset(offset)
      .orderBy(opts.sortBy, opts.sortDir)
  }

  static async countAll(filter, opts = {}) {
    const query = this.query(opts.transaction)

    filter = await this.buildSearchFilter(filter)
    if (filter.currency) {
      query.whereIn('currency', [ ...filter.currency ])
      delete filter.currency
    }
    query.where(filter).count('walletId as total')
    opts.forUpdate && query.forUpdate()

    return query
  }

  static async buildSearchFilter(queryParams) {
    const filter = pick(queryParams, constants.WALLETS_SEARCH_FILTER_KEYS)
    if (filter.currency && typeof filter.currency === 'string') {
      filter.currency = [filter.currency]
    }

    return filter
  }

  static async create(data, opts = {}) {
    const walletData = Object.assign({}, data, {
      walletUid: uuid(),
    })
    return this.query(opts.transaction).insert(walletData)
  }

  // TODO: Unit test
  static async changeBalance(walletUid, amount, balanceType, opts = {}) {
    console.assert(constants.BALANCE_TYPES.includes(balanceType), `Unknown balance type ${balanceType}!`)

    const fieldName = `${balanceType}Balance`

    const query = this.query(opts.transaction)
      .where('walletUid', walletUid)

    if (amount > 0) {
      query.increment(fieldName, amount)
    }
    else if (amount < 0) {

      const wallet = await this.findByUid(walletUid)
      if (new Big(wallet[fieldName]).lt(new Big(amount).abs())) {
        throw new Error('You cannot spend what you do not have')
      }

      query.decrement(fieldName, amount * -1)
    }

    return query
  }

  // TODO: Unit test
  static async lockBalance(walletUid, amount, opts = {}) {
    await Wallets.changeBalance(walletUid, -amount, 'available', opts)
    await Wallets.changeBalance(walletUid, amount, 'locked', opts)
    return Wallets.findByUid(walletUid, opts)
  }

  // TODO: Unit test
  static async unlockBalance(walletUid, amount, opts = {}) {
    await Wallets.changeBalance(walletUid, amount, 'available', opts)
    await Wallets.changeBalance(walletUid, -amount, 'locked', opts)
    return Wallets.findByUid(walletUid, opts)
  }

  async $beforeInsert() {
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }

  async $beforeUpdate() {
    this.updatedAt = Date.now()
  }
}
