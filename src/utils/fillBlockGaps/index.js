/* eslint-disable no-param-reassign,no-await-in-loop */
const moment = require('moment');
const { LAST_BLOCKS_NUMBER_FOR_CALCULATING_AVG_APS_TPS } = require('config');
const { BlockModelV2, StateModelV2 } = require('../../db');
const { SECOND } = require('../../constants');
const { potatoApi, pickAs, logInfo, setSensitiveInterval, logError } = require('../../helpers');
const getActionsCount = require('../../routines/handleBlock/getActionsCount');
const createBlockDataComposer = require('../../handlers/info/blockDataComposer');

const getBlockFromChain = async (blockNum) => {
  const [beforePrevious, previous, current] = await Promise.all([
    potatoApi.get_block(blockNum - 2),
    potatoApi.get_block(blockNum - 1),
    potatoApi.get_block(blockNum),
  ]);
  let blockTps;
  let blockAps;
  const timestamp = moment.utc(current.timestamp).valueOf();
  const { producer } = current;
  const currentTs = Date.parse(current.timestamp);
  const previousTs = Date.parse(previous.timestamp);
  if (currentTs - previousTs >= SECOND) {
    const { trxCounter: transactionsNumber, actionsCounter: actionsNumber} = getActionsCount(current);
    const producedInSeconds = (currentTs - previousTs) / SECOND;
    blockTps = transactionsNumber / producedInSeconds;
    blockAps = actionsNumber / producedInSeconds;
  } else {
    previous.producedInSeconds = (Date.parse(previous.timestamp) - Date.parse(beforePrevious.timestamp)) / SECOND;
    
    const {trxCounter: previousTransactionsNumber, actionsCounter: previousActionsNumber} = getActionsCount(previous);
    const {trxCounter: currentTransactionsNumber, actionsCounter: currentActionsNumber} = getActionsCount(current);

    blockTps = currentTransactionsNumber + (previousTransactionsNumber / previous.producedInSeconds / 2);
    blockAps = currentActionsNumber + (previousActionsNumber / previous.producedInSeconds / 2);
  }
  return {
    blockNumber: blockNum,
    producer,
    blockTps,
    blockAps,
    timestamp,
  };
};

const getPreviousBlocks = async (blockNum) => {
  const blockFromDb = await BlockModelV2
    .find({ blockNumber: { $lt: blockNum, $gt: blockNum - LAST_BLOCKS_NUMBER_FOR_CALCULATING_AVG_APS_TPS - 1 } })
    .sort({ blockNumber: -1 })
    .exec();
  if (blockFromDb.length === LAST_BLOCKS_NUMBER_FOR_CALCULATING_AVG_APS_TPS) {
    return blockFromDb;
  }
  const blocks = [];
  for (let i = blockNum - LAST_BLOCKS_NUMBER_FOR_CALCULATING_AVG_APS_TPS; i < blockNum; i += 1) {
    const block = blockFromDb.find(b => b.blockNumber === blockNum);
    blocks.push(block || await getBlockFromChain(blockNum));
  }
  return blocks;
};

const fillGap = async () => {
  try {
    const startTs = Date.now();
    const { lastFilledBlock } = (await StateModelV2.findOne({ id: 1 }).select('utils').exec()).utils.fillBlockGaps;
    if (lastFilledBlock + 1 < 21) {
      const block = await potatoApi.get_block(lastFilledBlock + 1);
      const chartBlock = {
        blockNumber: lastFilledBlock + 1,
        producer: block.producer,
        liveTps: 0,
        liveAps: 0,
        blockTps: 0,
        blockAps: 0,
        timestamp: moment.utc(block.timestamp).valueOf(),
      };
      await BlockModelV2.updateOne({ blockNumber: chartBlock.blockNumber }, chartBlock, { upsert: true }).exec();
      await StateModelV2.updateOne({ id: 1 }, { $inc: { 'utils.fillBlockGaps.lastFilledBlock': 1 } }).exec();
      logInfo(`Gap ${lastFilledBlock + 1} was filled`);
      return;
    }
    const composer = createBlockDataComposer();
    const previousBlocks = await getPreviousBlocks(lastFilledBlock + 1);
    composer.updateStorage({
      previous: await potatoApi.get_block(lastFilledBlock + 1),
      previous_live_aps: previousBlocks.map(b => b.blockAps),
      previous_live_tps: previousBlocks.map(b => b.blockTps),
      replacedNumber: LAST_BLOCKS_NUMBER_FOR_CALCULATING_AVG_APS_TPS,
    });
    const block = composer.composeData({
      block: await potatoApi.get_block(lastFilledBlock + 1),
    });
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
    await StateModelV2.updateOne({ id: 1 }, { $inc: { 'utils.fillBlockGaps.lastFilledBlock': 1 } }).exec();
    logInfo(`Gap ${lastFilledBlock + 1} was filled. Time: ${Date.now() - startTs}`);
  } catch (e) {
    logError('utils fill blocks gap error');
    logError(e);
  }
};

module.exports = () => setSensitiveInterval(fillGap, 0);
