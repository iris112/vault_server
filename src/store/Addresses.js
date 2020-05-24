import { Model } from 'objection'
import * as constants from '../constants'

export default class Addresses extends Model {
  static tableName = 'Addresses'

  static get relationMappings() {
    const Wallets = require('./Wallets')
    return {
      wallet: {
        relation: Model.BelongsToOneRelation,
        modelClass: Wallets,
        join: {
          from: 'Addresses.walletId',
          to: 'Wallets.walletId',
        },
      },
    }
  }

  static jsonSchema = {
    type: 'object',
    required: [
      'walletId', 'userUid', 'currency', 'address',
    ],
    properties: {
      walletId: { type: 'integer' },
      userUid: {
        type: 'string',
        pattern: '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$',
      },
      currency: {
        type: 'string',
      },
      address: {
        type: 'string',
      },
      // TODO: Store it encrypted
      privateKey: {
        type: 'string',
      },
      createdAt: { type: 'integer' },
      updatedAt: { type: 'integer' },
    },
  }

  static async create(data, opts = {}) {
    const addressData = Object.assign({}, data)
    return this.query(opts.transaction).insert(addressData)
  }

  static async find(filter, opts = {}) {
    let query = this.query(opts.transaction)
      .eager('wallet')
      .where(filter)

    opts.forUpdate && query.forUpdate()

    return query.first()
  }

  static async findAll(filter, opts = {}) {
    const query = this.query(opts.transaction)
      .where(filter)
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async countAll(filter, opts = {}) {
    const query = this.query(opts.transaction)
      .where(filter)
      .count('addressId as total')
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async getAllByCurrency(currency, opts = {}) {
    if(currency instanceof Array) {

      return this.query(opts.transaction)
        .eager('wallet')
        .whereIn('currency', currency)
    } else {

      return this.query(opts.transaction)
        .eager('wallet')
        .where('currency', currency)
    }
  }

  async $beforeInsert() {
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }

  async $beforeUpdate() {
    this.updatedAt = Date.now()
  }
}
