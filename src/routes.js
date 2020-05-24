import Router from 'koa-router'
import { middleware as validate } from '@cc-dev/validator'
import { requestSigValidator, responseSigner } from '@cc-dev/request'
import validateCurrency from './lib/middlewares/validateCurrency'
import addPayment from './handlers/payments/addPayment'
import cancelPayment from './handlers/payments/cancelPayment'
import pay from './handlers/payments/pay'
import listPayments from './handlers/payments/listPayments'
import getWallet from './handlers/wallets/getWallet'
import listWallets from './handlers/wallets/listWallets'
import createWallet from './handlers/wallets/createWallet'
import createWalletWithBalance from './handlers/wallets/createWalletWithBalance'
import changeBalance from './handlers/wallets/changeBalance'
import listWalletClients from './handlers/wallets/listWalletClients'
import changeBulkWalletBalance from './handlers/wallets/changeBulkWalletBalance'
import listDeposits from './handlers/deposits/listDeposits'
import deploySmartContract from './handlers/erc20/deploySmartContract'
import createMarketAccount from './handlers/market/createMarketAccount'
import addCurrency from './handlers/currencies/addCurrency'
import getCurrency from './handlers/currencies/getCurrency'
import ping from './handlers/ping'

const router = Router()

// TODO: Validate user to auth-service

router.post(
  '/wallets/getWallet',
  requestSigValidator(['cce', 'kryptostack', 'ccgames']),
  validate(getWallet.schema),
  validateCurrency,
  getWallet,
  getWallet.publicViews.details,
  responseSigner(['cce', 'kryptostack', 'ccgames']),
)
router.post(
  '/wallets/create',
  requestSigValidator(['cce', 'kryptostack', 'ccgames']),
  validate(createWallet.schema),
  validateCurrency,
  createWallet,
  getWallet.publicViews.details,
  responseSigner(['cce', 'kryptostack', 'ccgames']),
)
router.post(
  '/wallets/createWithBalance',
  requestSigValidator(['ccgames']),
  validate(createWalletWithBalance.schema),
  validateCurrency,
  createWalletWithBalance,
  getWallet.publicViews.details,
  responseSigner(['ccgames']),
)
router.post(
  '/wallets/listWallets',
  requestSigValidator(['cce', 'kryptostack', 'ccgames']),
  validate(listWallets.schema),
  listWallets,
  getWallet.publicViews.list,
  responseSigner(['cce', 'kryptostack', 'ccgames']),
)
router.post(
  '/wallets/listClients',
  requestSigValidator(['cce', 'admin', 'kryptostack']),
  validate(listWalletClients.schema),
  listWalletClients,
  listWalletClients.publicViews.list,
  responseSigner(['cce', 'admin', 'kryptostack']),
)
router.post(
  '/wallets/changeBulkBalance',
  requestSigValidator(['ccgames']),
  validate(changeBulkWalletBalance.schema),
  changeBulkWalletBalance,
  getWallet.publicViews.list,
  responseSigner(['ccgames']),
)

router.post(
  '/wallets/addPayment',
  requestSigValidator(['cce', 'kryptostack', 'ccgames']),
  validate(addPayment.schema),
  validateCurrency,
  addPayment,
  addPayment.publicViews.details,
  getWallet.publicViews.details,
  responseSigner(['cce', 'kryptostack', 'ccgames']),
)
router.post(
  '/wallets/cancelPayment',
  requestSigValidator(['cce', 'ccgames']),
  validate(cancelPayment.schema),
  validateCurrency,
  cancelPayment,
  addPayment.publicViews.details,
  getWallet.publicViews.details,
  responseSigner(['cce', 'ccgames']),
)
router.post(
  '/wallets/listPayments',
  requestSigValidator(['cce', 'kryptostack', 'ccgames']),
  validate(listPayments.schema),
  validateCurrency,
  listPayments,
  listPayments.publicViews.list,
  responseSigner(['cce', 'kryptostack', 'ccgames']),
)
router.post(
  '/wallets/listDeposits',
  requestSigValidator(['cce', 'kryptostack', 'ccgames']),
  validate(listDeposits.schema),
  validateCurrency,
  listDeposits,
  listDeposits.publicViews.list,
  responseSigner(['cce', 'kryptostack', 'ccgames']),
)

router.post(
  '/wallets/lockBalance',
  requestSigValidator(['cce', 'ccgames']),
  validate(changeBalance.schema),
  validateCurrency,
  changeBalance('lockBalance'),
  getWallet.publicViews.details,
  responseSigner(['cce', 'ccgames']),
)
router.post(
  '/wallets/unlockBalance',
  requestSigValidator(['cce', 'ccgames']),
  validate(changeBalance.schema),
  validateCurrency,
  changeBalance('unlockBalance'),
  getWallet.publicViews.details,
  responseSigner(['cce', 'ccgames']),
)

router.post(
  '/admin/ERC20/deploy',
  requestSigValidator(['ccadmin']),
  validate(deploySmartContract.schema),
  deploySmartContract,
  responseSigner(['ccadmin']),
)
router.post(
  '/admin/wallets/listWallets',
  requestSigValidator(['ccadmin']),
  validate(listWallets.schemaAdmin),
  listWallets,
  getWallet.publicViews.list,
  responseSigner(['ccadmin']),
)
router.post(
  '/admin/wallets/getWallet',
  requestSigValidator(['ccadmin']),
  validate(getWallet.schema),
  validateCurrency,
  getWallet,
  getWallet.publicViews.details,
  responseSigner(['ccadmin']),
)
router.post(
  '/admin/wallets/cancelPayment',
  requestSigValidator(['ccadmin']),
  validate(cancelPayment.schema),
  validateCurrency,
  cancelPayment,
  addPayment.publicViews.details,
  getWallet.publicViews.details,
  responseSigner(['ccadmin']),
)
router.post(
  '/admin/wallets/pay',
  requestSigValidator(['ccadmin']),
  validate(pay.schema),
  validateCurrency,
  pay,
  addPayment.publicViews.details,
  getWallet.publicViews.details,
  responseSigner(['ccadmin']),
)
router.post(
  '/admin/wallets/listPayments',
  requestSigValidator(['ccadmin']),
  validate(listPayments.schemaAdmin),
  validateCurrency,
  listPayments,
  listPayments.publicViews.list,
  responseSigner(['ccadmin']),
)
router.post(
  '/admin/wallets/listDeposits',
  requestSigValidator(['ccadmin']),
  validate(listDeposits.schemaAdmin),
  validateCurrency,
  listDeposits,
  listDeposits.publicViews.list,
  responseSigner(['ccadmin']),
)

router.post(
  '/market/createAccount',
  requestSigValidator(['ccmarket']),
  validate(createMarketAccount.schema),
  validateCurrency,
  createMarketAccount,
  createMarketAccount.publicViews.details,
  responseSigner(['ccmarket']),
)

router.post(
  '/currencies/addCurrency',
  requestSigValidator(['ccgames']),
  validate(addCurrency.schema),
  addCurrency,
  responseSigner(['ccgames']),
)

router.post(
  '/currencies/getCurrency',
  requestSigValidator(['ccgames']),
  validate(getCurrency.schema),
  getCurrency,
  responseSigner(['ccgames']),
)

router.get('/ping', ping)

export default router.routes()
