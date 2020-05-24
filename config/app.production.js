const config = {
  app: {
    port: process.env.PORT,
  },
  mysql: {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_DB,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    debug: false,
  },
  aws: {
    config: {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    // TODO: Hack, staging config to connect to staging SQS
    marketConfig: {
      region: process.env.AWS_REGION_MARKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID_MARKET,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_MARKET,
    },
    dynamo: {
      CryptoClientSettings: {
        tableName: process.env.AWS_DYNAMO_CRYPTO_CLIENT_SETTINGS_TABLE_NAME,
      },
      CryptoClientHealth: {
        tableName: process.env.AWS_DYNAMO_CRYPTO_CLIENT_HEALTH_TABLE_NAME,
      },
      Cache: {
        tableName: process.env.AWS_DYNAMO_CACHE_TABLE_NAME,
      },
      CurrencySettings: {
        tableName: process.env.AWS_DYNAMO_CURRENCY_SETTINGS_TABLE_NAME,
      },
    },
    sqs: {
      market: {
        url: process.env.AWS_SQS_MARKET_URL,
        messageGroupId: 'accounts',
      }
    },
  },
  logger: {
    enabled: true,
    name: process.env.LOGGER_NAME,
    plugins: {
      console: true,
      cloudWatch: process.env.LOGGER_LOGGERS ? process.env.LOGGER_LOGGERS.toLowerCase().includes('cloudwatch') : false,
      paperTrail: process.env.LOGGER_LOGGERS ? process.env.LOGGER_LOGGERS.toLowerCase().includes('papertrail') : false,
      rollbar: process.env.LOGGER_LOGGERS ? process.env.LOGGER_LOGGERS.toLowerCase().includes('rollbar') : false,
    },
  },
  paperTrail: {
    host: process.env.PAPERTRAIL_HOST,
    port: process.env.PAPERTRAIL_PORT,
  },
  rollbar: {
    accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
    reportLevel: process.env.ROLLBAR_LEVEL || 'warn',
  },
  bodySigner: {
    cce: {
      kmsKeyId: process.env.BODY_SIGNER_CCE_KMS_KEY_ID,
      skipRequestValidation: !!process.env.BODY_SIGNER_CCE_SKIP_REQUEST_VALIDATION,
      marketSecret: process.env.BODY_SIGNER_CCE_MARKET_SECRET,
    },
    ccadmin: {
      kmsKeyId: process.env.BODY_SIGNER_CCADMIN_KMS_KEY_ID,
      skipRequestValidation: !!process.env.BODY_SIGNER_CCADMIN_SKIP_REQUEST_VALIDATION,
    },
    kryptostack: {
      externalKeyId: process.env.BODY_SIGNER_KRYPTOSTACK_KEY_ID,
      secret: process.env.BODY_SIGNER_KRYPTOSTACK_SECRET,
      skipRequestValidation: !!process.env.BODY_SIGNER_KRYPTOSTACK_SKIP_REQUEST_VALIDATION,
    },
    ccmarket: {
      externalKeyId: process.env.BODY_SIGNER_CCMARKET_KEY_ID,
      secret: process.env.BODY_SIGNER_CCMARKET_SECRET,
      skipRequestValidation: !!process.env.BODY_SIGNER_CCMARKET_SKIP_REQUEST_VALIDATION,
    },
    ccgames: {
      externalKeyId: process.env.BODY_SIGNER_CCGAMES_KEY_ID,
      secret: process.env.BODY_SIGNER_CCGAMES_SECRET,
      skipRequestValidation: !!process.env.BODY_SIGNER_CCGAMES_SKIP_REQUEST_VALIDATION,
    },
  },
  cceEngine: {
    messageBusInUrl: process.env.MESSAGE_BUS_IN_URL,
    messageBusPollInterval: process.env.MESSAGE_BUS_POLL_INTERVAL,
    messageGroupId: 'message-bus-messages',
  },
  sms: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    enabled: process.env.TWILIO_ENABLED === 'true' || process.env.TWILIO_ENABLED === '1',
    from: process.env.TWILIO_FROM_NUMBER,
    to: process.env.TWILIO_TO_NUMBER
  },
  binance: {
    enabled: process.env.BINANCE_ENABLED === 'true' || process.env.BINANCE_ENABLED === '1',
    endpoint: process.env.BINANCE_ENDPOINT || 'https://api.binance.com',
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
  },
}

export default config
