const {
  GET_GENERAL_ADDITIONAL_INFO_INTERVAL,
  LISTENERS: { ON_INFO_CHANGE_INTERVAL },
} = require('config');
const moment = require('moment');
const uniqBy = require('lodash/uniqBy');

const { potatoApi, createLogger, castToInt, pickAs } = require('../../helpers');
const { StateModelV2, BlockModelV2, connect } = require('../../db');
const { BLOCK_CHART_PERIOD, RESTORE_BLOCK_CHART_INTERVAL, KILOBYTE } = require('../../constants');
const getBlockInfo = require('./getBlockInfo');
const createBlockDataComposer = require('./blockDataComposer');

const { error: logError } = createLogger();
const blockDataComposer = createBlockDataComposer();

const convertBytesToGB = value => (value ? value / 1024 / 1024 / 1024 : 0);
// initial state
let info = { number: 0, block: {}, info: {} };
const chart = [];
let schedule;

const restoreChart = async () => {
  const from = Date.now() - BLOCK_CHART_PERIOD;
  const history = await BlockModelV2
    .find({ timestamp: { $gt: from } })
    .sort({ blockNumber: 1 })
    .exec();
  chart.length = 0;
  chart.push(
    ...history,
  );
};

const saveBlock = async (block) => {
  const chartBlock = pickAs(block, {
    blockNumber: 'block_num',
    producer: 'producer',
    liveTps: 'live_tps',
    liveAps: 'live_aps',
    blockTps: 'block_tps',
    blockAps: 'block_aps',
    timestamp: () => moment.utc(block.timestamp).valueOf(),
  });
  await BlockModelV2.updateOne({ blockNumber: chartBlock.blockNumber }, chartBlock, { upsert: true }).exec();
  chart.push(chartBlock);
  if (chart[chart.length - 1].timestamp - chart[0].timestamp >= BLOCK_CHART_PERIOD) {
    for (let i = 1; i < chart.length; i += 1) {
      chart[i - 1] = chart[i];
    }
  }
};

const notify = () => {
  try {
    process.send({ ...info, info: { ...info.additionalInfo, ...info.info }, chart: uniqBy(chart, 'blockNumber') });
  } catch (e) {
    logError(e);
  }
};

const updateBlockData = ({ nextInfo, state }) => {
  blockDataComposer.updateStorage({ previous: { ...info.block } });
  const block = blockDataComposer.composeData({
    ...nextInfo,
    max_aps: state.max_aps,
    max_tps: state.max_tps,
    max_tps_block: state.max_tps_block,
    max_aps_block: state.max_aps_block,
  });
  saveBlock(block);
  info = {
    ...info,
    blockNum: nextInfo.blockNum,
    block,
    chart,
  };
};

const getInfo = async () => {
  try {
    const state = await StateModelV2.findOne({ id: 1 })
      .select('max_aps max_tps max_tps_block max_aps_block')
      .exec();
    const nextInfo = await getBlockInfo(schedule);
    if (castToInt(info.blockNum) < castToInt(nextInfo.blockNum)) {
      updateBlockData({ nextInfo, state });
    }
    if (castToInt(info.number) >= castToInt(nextInfo.number)) {
      getInfo();
      return;
    }
    info = {
      ...info,
      ...pickAs(nextInfo, ['number', 'info']),
    };
    if (ON_INFO_CHANGE_INTERVAL === 0) {
      notify();
    }
    getInfo();
  } catch (e) {
    logError(e);
    getInfo();
  }
};

const getAdditionalInfo = async () => {
  try {
    const { rows: [tableInfo] } =
      await potatoApi.get_table_rows({ json: true, scope: 'potato', code: 'potato', table: 'global' });
    const { core_liquid_balance: coreLiquidBalance } = await potatoApi.get_account({ account_name: 'pc.ramfee' });
    const [savingTotalBalance] = await potatoApi.get_currency_balance('pc.token', 'pc.saving');
    const { rows: [ramInfo] } = await potatoApi.get_table_rows({
      json: true,
      code: 'potato',
      scope: 'potato',
      table: 'rammarket',
      limit: 1,
    });
    const quoteRam = Number(ramInfo.quote.balance.split(' ')[0]);
    const baseRam = Number(ramInfo.base.balance.split(' ')[0]);
    const additionalInfo = {
      maxRamSize: tableInfo.max_ram_size,
      totalUnpaidBlocks: tableInfo.total_unpaid_blocks,
      totalActivatedStake: tableInfo.total_activated_stake,
      coreLiquidBalance,
      savingTotalBalance,
      totalRamUsedInBytes: tableInfo.total_ram_bytes_reserved,
      totalRamUsed: convertBytesToGB(tableInfo.total_ram_bytes_reserved),
      totalRamStakeInBytes: tableInfo.total_ram_stake,
      totalRamStake: convertBytesToGB(tableInfo.total_ram_stake),
      currentRamPrice: ((quoteRam / baseRam) * KILOBYTE).toFixed(5),
    };
    info = {
      ...info,
      additionalInfo,
    };
  } catch (e) {
    logError(e);
  }
};

const initInfoHandler = async () => {
  await connect();
  await restoreChart();
  schedule = await potatoApi.get_producer_schedule({});
  getInfo();
  setInterval(getAdditionalInfo, GET_GENERAL_ADDITIONAL_INFO_INTERVAL);
  setInterval(restoreChart, RESTORE_BLOCK_CHART_INTERVAL);

  if (ON_INFO_CHANGE_INTERVAL) {
    setInterval(notify, ON_INFO_CHANGE_INTERVAL);
  }
};

initInfoHandler();
