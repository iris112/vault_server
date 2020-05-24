require('babel-register')
require('dotenv').config();

if(process.env.CURRENCY !== undefined) {
  require('./src/polling')
} else if (process.env.PROCESS_NAME === 'messageBus') {
  require('./src/messageBus')
} else if (process.env.PROCESS_NAME === 'market') {
  require('./src/market')
} else if (process.env.PROCESS_NAME === 'binance') {
  require('./src/binance')
} else if (process.env.PROCESS_NAME === 'jobs') {
  require('./src/runJob')
} else {
  require('./src/app')
}

