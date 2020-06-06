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
export default class Signaller implements AsyncIterable<any> {
  /**
   * The identifier associated with this client.
   *
   * This is useful in order to share with others, so they'll be able to send you messages.
   */
  public readonly id: ID;

  /**
   * Create a new signaller.
   *
   * Since we use polling for detecting messages, we can pass a timeout specifying
   * how often to poll for new messages.
   *
   * @param timeout the number of milliseconds to wait between messages
   */
  constructor(private readonly timeout = 500) {
    this.id = newID();
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
    const tagged = { ...message, from: this.id };
    await postData(`/api/messages/${to}`, tagged);
  }

  // Dunno why we can't make Symbol.asyncIterator a generator directly.
  private async *iter() {
    for (;;) {
      const result = await get(`/api/messages/${this.id}`);
      for (const m of result.messages) {
        yield m;
      }
      await wait(this.timeout);
    }
  }

  [Symbol.asyncIterator]() {
    return this.iter();
  }
}
