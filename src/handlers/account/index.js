/* eslint-disable no-mixed-operators */
const flatten = require('lodash/flatten');
const { potatoApi, createLogger } = require('../../helpers');
const { AccountModelV2 } = require('../../db');

const { error: logError } = createLogger();

const getBalanceFor = async (name, token) => {
  try {
    return await potatoApi.get_currency_balance(token, name);
  } catch (e) {
    return undefined;
  }
};

const getBalancesFor = async name => {
  const account = await AccountModelV2.findOne({ name }).select('tokenData.tokens').exec();
  const tokens = account && account.tokenData && account.tokenData.tokens || [];
  const potatoBalancePromise = potatoApi.get_currency_balance('pc.token', name);
  const otherBalancePromises = tokens.map(t => getBalanceFor(name, t));
  const balances = await Promise.all([potatoBalancePromise].concat(otherBalancePromises));
  return flatten(balances).filter(b => b);
};

const initAccountHandler = () => ({
  async getAccount(account_name) {
    try {
      if (!account_name || account_name.length > 21) {
        return {};
      }
      const account = await potatoApi.get_account(account_name);
      const balances = await getBalancesFor(account_name);
      return { ...account, balance: (balances && balances[0]) || '0.0 POC', balances: balances.slice(1) };
    } catch (e) {
      logError(e);
      return {};
    }
  },
});

module.exports = initAccountHandler;
