module.exports = require(`./app.${process.env.NODE_ENV || 'dev'}.js`)
