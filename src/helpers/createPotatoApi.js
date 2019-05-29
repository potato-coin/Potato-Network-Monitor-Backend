const { NODE, RESERVE_NODES, POTATO: { GET_INFO_API_PATH } } = require('config');
// const EosApi = require('eosjs-api');
const { Api, JsonRpc, RpcError } = require('pcjs');
const fetch = require('node-fetch');
const request = require('request-promise-native');

const { info: logInfo } = require('./logger').createLogger();

const getInfoWithRequest = ({ host, port }) => {
  const url = `${host}:${port}${GET_INFO_API_PATH}`;
  const options = {
    url,
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'max-age=0',
      Connection: 'keep-alive',
      Host: `${host}:${port}`,
      'Upgrade-Insecure-Requests': 1,
      'User-Agent': 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36',
    },
    json: true,
    timeout: 80000,
    rejectUnauthorized: false,
  };
  return request(options);
};

const logger = { // Default logging functions
  log: () => {},
  error: () => {},
};

const createPotatoApi = ({ host = NODE.HOST, port = NODE.PORT, isVariable = true, onlyRequest = false } = {}) => {
  const nodes = [NODE].concat(RESERVE_NODES);

  let currentNodeIndex = 0;
  let eos = new JsonRpc(`${host}:${port}`, { fetch });

  const changeNode = () => {
    currentNodeIndex += 1;
    if (currentNodeIndex >= nodes.length) {
      currentNodeIndex = 0;
    }
    const currentNode = nodes[currentNodeIndex];
    if (!currentNode) {
      return;
    }
    eos = new JsonRpc(`${currentNode.HOST}:${currentNode.PORT}`, { fetch });
    logInfo(`Node was changed on ${currentNode.HOST}:${currentNode.PORT}`);
  };

  // // wrap every potatoApi function
  // const eosWrapper = Object.keys(eos).reduce((acc, key) => {
  //   if (typeof eos[key] === 'function') {
  //     const eosFunction = async (...args) => {
  //       const startTs = Date.now();
  //       const res = await eos[key](...args);
  //       if ((Date.now() - startTs) > NODE.ALLOWABLE_MAX_PING && isVariable) {
  //         changeNode();
  //       }
  //       return res;
  //     };
  //     return {
  //       ...acc,
  //       [key]: eosFunction,
  //     };
  //   }
  //   return {
  //     ...acc,
  //     [key]: eos[key],
  //   };
  // }, Object.create(null));

  // const getInfo = async (args = {}) => {
  //   try {
  //     return onlyRequest
  //       ? getInfoWithRequest({ host, port })
  //       : eosWrapper.getInfo(args);
  //   } catch (e) {
  //     if (isVariable) {
  //       return getInfo(args);
  //     }
  //     return getInfoWithRequest({ host, port });
  //   }
  // };

  const get_info = async () => eos.get_info();
  const get_block = async (blockNumOrId) => {
    return eos.get_block(blockNumOrId);
  }
  const get_account = async (accountName) => eos.get_account(accountName);
  const get_producers = async (json = true, lowerBound = null, limit = null) => eos.get_producers(json, lowerBound, limit);
  const get_producer_schedule = async () => eos.get_producer_schedule();
  const get_currency_balance = async (code, account, symbol = null) => eos.get_currency_balance(code, account, symbol);
  const get_currency_stats = async (code, symbol) => eos.get_currency_stats(code, symbol);
  const get_table_rows = async (args) => eos.get_table_rows(args);
  const get_table_by_scope = async (args) => eos.get_table_by_scope(args);

  return {
    // ...eosWrapper,
    // getInfo,
    get_info,
    get_block,
    get_account,
    get_producers,
    get_producer_schedule,
    get_currency_balance,
    get_currency_stats,
    get_table_rows,
    get_table_by_scope,
  };
};

module.exports = createPotatoApi;
