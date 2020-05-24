import { Model } from 'objection'

export default class MarketAccounts extends Model {
  static tableName = 'MarketAccounts'

  static jsonSchema = {
    type: 'object',
    required: [
      'currency', 'address',
    ],
    properties: {
      accountId: { type: 'integer' },
      currency: {
        type: 'string',
      },
      address: {
        type: 'string',
      },
      balance: {
        type: 'integer',
      },
      createdAt: { type: 'integer' },
      updatedAt: { type: 'integer' },
    },
  }

  static async create(account, opts = {}) {
    return this.query(opts.transaction).insert(account)
  }

  static async findByAddress(address, opts = {}) {
    const query = this.query(opts.transaction)
      .where({ address })
      .first()
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async find(address, opts = {}) {
    let query = this.query(opts.transaction)
      .where({ address })

    opts.forUpdate && query.forUpdate()

    return query.first()
  }

  static async findAll(filter = {}, opts = {}) {
    const query = this.query(opts.transaction)
      .where(filter)
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async countAll(filter, opts = {}) {
    const query = this.query(opts.transaction)
      .where(filter)
      .count('accountId as total')
    opts.forUpdate && query.forUpdate()
    return query
  }

  static async update(address, data, opts = {}) {
    const updateData = { ...data }

    await this.query(opts.transaction)
      .patch(updateData)
      .where({ address })

    return this.findByAddress(address, opts)
  }

  static async changeBalance(address, amount, opts = {}) {
    const query = this.query(opts.transaction)
      .where({ address })

    if (amount > 0) {
      query.increment('balance', amount)
    } else if (amount < 0) {
      query.decrement('balance', amount * -1)
    }

    return query
  }

  async $beforeInsert() {
    this.createdAt = Date.now()
    this.updatedAt = Date.now()
  }

  async $beforeUpdate() {
    this.updatedAt = Date.now()
  }
}
