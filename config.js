var config = {
  basePath: '/bws/api',
  disableLogs: false,
  port: 3232,

  // Uncomment to make BWS a forking server
  // cluster: true,

  // Uncomment to set the number or process (will use the # of available CPUs by default)
  // clusterInstances: 4,

  // https: true,
  // privateKeyFile: 'private.pem',
  // certificateFile: 'cert.pem',
  ////// The following is only for certs which are not
  ////// trusted by nodejs 'https' by default
  ////// CAs like Verisign do not require this
  // CAinter1: '', // ex. 'COMODORSADomainValidationSecureServerCA.crt'
  // CAinter2: '', // ex. 'COMODORSAAddTrustCA.crt'
  // CAroot: '', // ex. 'AddTrustExternalCARoot.crt'

  storageOpts: {
    mongoDb: {
      uri: 'mongodb://localhost:27017/bws',
    },
  },
  lockOpts: {
    //  To use locker-server, uncomment this:
    lockerServer: {
      host: 'localhost',
      port: 3231,
    },
  },
  messageBrokerOpts: {
    //  To use message broker server, uncomment this:
    messageBrokerServer: {
      url: 'http://localhost:3380',
    },
  },
  blockchainExplorerOpts: {
    livenet: {
      provider: 'insight',
      url: 'http://192.168.30.107:3001',
      apiPrefix:'/insight-api-trvc'
    },
    testnet: {
      provider: 'insight',
      url: 'https://testnet-insight.trivecoin.org',
      apiPrefix:'/api'
      // url: 'testnet-insight.trivecoin.org',
      // url: 'http://localhost:3001',
      // Multiple servers (in priority order)
      // url: ['http://a.b.c', 'https://test-insight.bitpay.com:443'],
    },
  },
  pushNotificationsOpts: {
    templatePath: './lib/templates',
    defaultLanguage: 'en',
    defaultUnit: 'btc',
    subjectPrefix: '',
    pushServerUrl: 'https://fcm.googleapis.com/fcm',
    authorizationKey: 'AIzaSyABG5-i5l__IrUF_iUMtaL3AJ5JRybc5AM',
  },
  fiatRateServiceOpts: {
    defaultProvider: 'BitPay',
    fetchInterval: 60, // in minutes
  },
  // To use email notifications uncomment this:
  // emailOpts: {
  //  host: 'localhost',
  //  port: 25,
  //  ignoreTLS: true,
  //  subjectPrefix: '[Wallet Service]',
  //  from: 'wallet-service@bitcore.io',
  //  templatePath: './lib/templates',
  //  defaultLanguage: 'en',
  //  defaultUnit: 'btc',
  //  publicTxUrlTemplate: {
  //    livenet: 'https://insight.bitpay.com/tx/{{txid}}',
  //    testnet: 'https://test-insight.bitpay.com/tx/{{txid}}',
  //  },
  //},
  //
  // To use sendgrid:
  // var sgTransport = require('nodemail-sendgrid-transport');
  // mailer:sgTransport({
  //  api_user: xxx,
  //  api_key: xxx,
  // });
};
module.exports = config;
