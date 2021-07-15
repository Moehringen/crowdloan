import { SignedBlock } from '@polkadot/types/interfaces';
import { SubstrateExtrinsic, SubstrateEvent } from '@subql/types';
import { SubstrateBlock } from '@subql/types';

import {
  handleCrowdloanContributed,
  handleCrowdloanCreated,
  handleCrowdloanDissolved,
  handleParachainRegistered,
  updateCrowdloanStatus
} from '../handlers/parachain-handler';

import { Chronicle } from '../types/models/Chronicle';
import { ChronicleKey } from '../constants';


const eventsMapping = {
  'registrar/Registered': handleParachainRegistered,
  'crowdloan/Created': handleCrowdloanCreated,
  'crowdloan/Contributed': handleCrowdloanContributed,
  'crowdloan/Dissolved': handleCrowdloanDissolved
};

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  await updateCrowdloanStatus(block);
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  const {
    event: { method, section },
    block: {
      block: { header }
    },
    idx,
    extrinsic
  } = event;

  const eventType = `${section}/${method}`;
  const { method: extMethod, section: extSection } = extrinsic?.extrinsic.method || {};
  const handler = eventsMapping[eventType];
  if (handler) {
    logger.info(
      `
      Event ${eventType} at ${idx} received, block: ${header.number.toNumber()}, extrinsic: ${extSection}/${extMethod}:
      -------------
        ${JSON.stringify(event.toJSON(), null, 2)} ${JSON.stringify(event.toHuman(), null, 2)}
      =============
      `
    );
    await handler(event);
  }
}

const init = async () => {
  const chronicle = await Chronicle.get(ChronicleKey);
  if (!chronicle) {
    logger.info('Setup Chronicle');
    await Chronicle.create({ id: ChronicleKey })
      .save()
      .catch((err) => logger.error(err));
  }
};

init();
