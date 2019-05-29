/* eslint-disable camelcase,no-plusplus,max-len */
/* ###############################################################################
#
# EOS TestNet Monitor
#
# Created by http://CryptoLions.io
#
# Git Hub: https://github.com/CryptoLions/EOS-Testnet-monitor
#
###############################################################################  */

const { potatoApi, createLogger } = require('../../helpers');
const handleData = require('./handleData');

const { info: logInfo, error: logError } = createLogger();

module.exports = async () => {
  try {
    const producersSystem = await potatoApi.get_producers(true, null, 1000);
    await handleData(producersSystem.rows);
    logInfo('producers info updated');
  } catch (e) {
    logError(e);
  }
};
