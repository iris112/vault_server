export default ping
async function ping(ctx, next) {
  ctx.body = { status: 'up' }

  await next()
}
