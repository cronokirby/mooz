import { NextApiRequest, NextApiResponse } from 'next';
import { getMessageQueue, ID } from '../../../src/backend/queues';

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const queue = await getMessageQueue();
    const messages = await queue.pending(req.query.id as ID);
    res.status(200);
    res.json({ messages });
  } else if (req.method === 'POST') {
    if (!req.body) {
      res.status(400);
      res.json({ error: 'Missing Body' });
    } else {
      const queue = await getMessageQueue();
      await queue.send(req.body, req.query.id as ID);
      res.status(200);
      res.json({ message: 'ok' });
    }
  } else {
    res.status(405);
    res.json({ error: 'Unacceptable Method' });
  }
};
