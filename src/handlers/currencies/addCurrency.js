import debug from 'debug'
import { Joi } from '@cc-dev/validator'
import * as constants from '../../constants'

const info = debug('CCVault:addCurrency')

export default addCurrency
async function addCurrency(ctx, next) {
    const currencySettings = { ...ctx.request.body }

    const existentCurrency = await ctx.CurrencySettings.findOne(
        currencySettings.currency
    )
    if (existentCurrency) {
        ctx.body = { error: { statusCode: 409, code: 'currencyAlreadyExists' } }
        ctx.status = 409
        return
    }

    await ctx.CurrencySettings.add([currencySettings])

    ctx.body = { result: currencySettings }

    await next()
}

addCurrency.schema = {
    body: Joi.object().keys({
        currency: Joi.string(),
        name: Joi.string(),
        type: Joi.any()
            .valid(constants.CURRENCY_TYPES)
            .optional()
            .default('cash'),
        minWithdrawAmount: Joi.number()
            .integer()
            .positive()
            .optional(),
        maxWithdrawAmount: Joi.number()
            .integer()
            .positive()
            .optional(),
        withdrawalFee: Joi.number()
            .integer()
            .min(0)
            .optional(),
        precision: Joi.number()
            .integer()
            .min(0)
            .optional()
            .default(8)
    })
}
