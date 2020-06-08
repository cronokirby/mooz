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
    console.log('sending', message, to);
    const tagged = { ...message, from: this.id };
    await postData(`/api/messages/${to}`, tagged);
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
