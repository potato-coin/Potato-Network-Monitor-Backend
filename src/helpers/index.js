const { correctBpUrl, correctApiUrl, correctP2PUrl, correctSslUrl } = require('./urlCorrector');

const { createLogger } = require('./logger');

const createPotatoApi = require('./createPotatoApi');

const castToInt = require('./castToNumber');
const castToString = require('./castToString');

const pickAs = require('./pickAs');

const setSensitiveInterval = require('./setSensitiveInterval');

const watchForServerResources = require('./watchForServerResources');

const { info: logInfo, error: logError } = createLogger();

module.exports = {
  correctBpUrl,
  correctApiUrl,
  correctP2PUrl,
  correctSslUrl,
  createLogger,
  logInfo,
  logError,
  createPotatoApi,
  potatoApi: createPotatoApi(),
  castToInt,
  castToString,
  pickAs,
  setSensitiveInterval,
  watchForServerResources,
};
