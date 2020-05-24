/**
 * validateCurrency
 *
 * Checks for a valid currency by body/query currency.
 *
 */
export default validateCurrency
async function validateCurrency(ctx, next) {
  const reqParams = ctx.request.body || ctx.request.query
  const { currency } = reqParams

  if (currency) {
    const clientSettings = await ctx.CurrencySettings.findOne(currency)
    if (!clientSettings) {
      ctx.body = {
        error: {
          statusCode: 409,
          code: 'unknownCurrency',
          message: 'Unknown currency type.',
          data: { currency },
        },
      }
      ctx.status = 409

      return
    }
  }

  await next()
}
