import type { NextApiRequest, NextApiResponse } from 'next';
import Pusher from 'pusher';
import type { ID } from '../../../src/identifier';

let pusher: Pusher | undefined;
function getPusherInstance(): Pusher {
  if (!pusher) {
    pusher = new Pusher({
      appId: '1014827',
      key: '6571d8c516428778fa06',
      secret: process.env.PUSHER_SECRET as string,
      cluster: 'eu',
    });
  }
  return pusher;
}

async function sendMessage(data: any, to: ID) {
  const pusher = getPusherInstance();
  return new Promise((resolve) =>
    pusher.trigger(to, 'signal', data, undefined, resolve),
  );
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    if (!req.body) {
      res.status(400);
      res.json({ error: 'Missing Body' });
    } else {
      await sendMessage(req.body, req.query.id as ID);
      res.status(200);
      res.json({ message: 'ok' });
    }
  } else {
    res.status(405);
    res.json({ error: 'Unacceptable Method' });
  }
};
