import { ID, newID } from '../identifier';

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

async function get(url: string) {
  const response = await fetch(url);
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

  private readonly cbs: ((msg: any) => void)[] = [];
  private started = false;

  /**
   * Create a new signaller.
   *
   * Since we use polling for detecting messages, we can pass a timeout specifying
   * how often to poll for new messages.
   *
   * @param timeout the number of milliseconds to wait between messages
   */
  constructor(private readonly timeout = 1000) {
    const id = newID();
    this.id = id;
  }

  private async startCallbacks() {
    this.started = true;
    for (;;) {
      await wait(this.timeout);
      const result = await get(`/api/messages/${this.id}`);
      for (const m of result.messages) {
        console.log('message', m);
        for (const cb of this.cbs) {
          cb(m);
        }
      }
    }
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
    if (!this.started) {
      this.startCallbacks();
    }
    this.cbs.push(cb);
  }
}
