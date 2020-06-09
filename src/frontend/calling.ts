import Peer from 'simple-peer';
import type { ID } from '../identifier';
import type Signaller from './Signaller';

export interface CallResult {
  peer: Peer.Instance;
  stream: MediaStream;
}

export async function makeCall(
  to: ID,
  signaller: Signaller,
  stream: MediaStream,
): Promise<CallResult> {
  const peer = new Peer({ initiator: true, stream });
  peer.on('signal', (data) => {
    signaller.send({ data }, to);
  });
  signaller.onMessage(({ data }) => peer.signal(data));
  return new Promise((resolve) =>
    peer.on('stream', (stream) => resolve({ stream, peer })),
  );
}

export async function listen(
  signaller: Signaller,
  stream: MediaStream,
): Promise<CallResult> {
  const unsent: any[] = [];
  let to: ID | undefined = undefined;
  const peer = new Peer({ stream });
  peer.on('signal', (data) => {
    if (!to) {
      unsent.push(data);
    } else {
      signaller.send({ data }, to);
    }
  });
  signaller.onMessage(({ data, from }) => {
    if (!to) {
      to = from;
      for (const data of unsent) {
        signaller.send({ data }, from);
      }
    }
    peer.signal(data);
  });
  return new Promise((resolve) =>
    peer.on('stream', (stream) => resolve({ stream, peer })),
  );
}
