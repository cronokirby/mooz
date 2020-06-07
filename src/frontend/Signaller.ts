import Pusher from 'pusher-js';
import { ID, newID } from '../identifier';

let pusher: Pusher | undefined;

function getPusherInstance(): Pusher {
  if (!pusher) {
    pusher = new Pusher('6571d8c516428778fa06', { cluster: 'eu' });
  }
  return pusher;
}

async function postData(url: string, data: any) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const LIMIT = 4;
const TIMEOUT = 1100;

/**
 * A signaller allows us to send and receive events about
 */
export default class Signaller {
  /**
   * The identifier associated with this client.
   *
   * This is useful in order to share with others, so they'll be able to send you messages.
   */
  public readonly id: ID;

  private readonly pusher: Pusher;
  private readonly cbs: ((msg: any) => void)[] = [];
  private readonly pending: any[] = [];
  private i = 0;

  /**
   * Create a new signaller.
   */
  constructor() {
    this.pusher = getPusherInstance();
    const id = newID();
    this.id = id;
    const channel = this.pusher.subscribe(id);
    channel.bind('signal', (data: any) => {
      console.log('signal', data);
      for (const cb of this.cbs) {
        cb(data);
      }
    });
    (async () => {
      for (;;) {
        await wait(TIMEOUT);
        for (let j = 0; j < LIMIT; ++j) {
          if (this.i >= this.pending.length) {
            break;
          }
          console.log('sending index', this.i);
          const { message, to } = this.pending[this.i];
          const tagged = { ...message, from: id };
          console.log('sending', message, to);
          await postData(`/api/messages/${to}`, tagged);
          ++this.i;
        }
      }
    })();
  }

  /**
   * Send a message to some identifier
   *
   * This will take care of tagging the message with our personal identifier, so
   * it can be replied to.
   *
   * @param message the message to send
   * @param to the identifier to send a message to
   */
  async send(message: any, to: ID) {
    this.pending.push({ message, to });
  }

  /**
   * Set a callback to call whenever a new message arrives
   *
   * @param cb the function to call
   */
  onMessage(cb: (message: any) => void) {
    this.cbs.push(cb);
  }
}
