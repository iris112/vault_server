import { Joi } from '@cc-dev/validator'

async function getCurrency(ctx, next) {
    const { currency } = ctx.request.body

    const currencySettings = await ctx.CurrencySettings.findOne(currency)

    if (!currencySettings) {
        ctx.body = { error: { statusCode: 404, code: 'currencyNotFound' } }
        ctx.status = 404
        return
    }

    ctx.body = { result: currencySettings }

    await next()
}

getCurrency.schema = {
    body: Joi.object().keys({
        currency: Joi.string()
    })
}

export default getCurrency
