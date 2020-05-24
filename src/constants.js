export const DEPOSIT_STATUSES = [
  'pending', 'confirmed',
]

export const WALLET_ADDRESS_LIMIT = 1

// Currencies compatible with the RPC API polling wrapper
// aka BTC forks/clones
export const BTC_FORKED_CURRENCIES = [
  'btc', 'ltc', 'zec', 'bch', 'dash',
  'doge', 'btg', 'xmr',
]

export const PAYMENT_STATUSES = [
  'pending', 'paid', 'canceled',
]

export const BALANCE_TYPES = [
  'available', 'locked',
]

export const CURRENCY_TYPES = [
  'cash', 'chain',
]

export const WALLETS_SEARCH_FILTER_KEYS = [
  'userUid', 'currency',
]

export const WALLETS_SORT_BY_KEYS = [
  'currency', 'availableBalance', 'lockedBalance', 'createdAt', 'updatedAt',
]
