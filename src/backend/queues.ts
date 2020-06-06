/**
 * Represents a way to identify some recipient of a message.
 */
export type ID = string & { readonly __tag: unique symbol };

/**
 * Represents a queue along which we can send messages to specific identifiers.
 *
 * We can send messages to a person, and read all of the pending messages for someone.
 *
 * Messages are just blobs of data, represented by `any`. We know that we can serialize
 * them using JSON though.
 */
export interface MessageQueue {
  /**
   * Send a message to some recipient.
   *
   * The next time we call `pending` for that recipient, this message should appear
   * after all of the other messages.
   *
   * @param message the data to send
   * @param to the identifier of the person to send the message to
   */
  send(message: any, to: ID): Promise<void>;
  /**
   * Flush all of the pending messages for a user.
   *
   * Calling this immediately after will return an empty array, until there are new
   * messages.
   *
   * @param to the identifier of the person to read messages for
   */
  pending(to: ID): Promise<ReadonlyArray<any>>;
}

/**
 * An implementation of a message queue that works in memory.
 *
 * This works fine in a standard server environment. The problem is that the queue
 * may be flaky in serverless environments, because multiple execution containers
 * may exist, and that will cause message loss and fragementation. In a serverless
 * context, you want to use one of the queues connected to Redis or DynamoDB, or
 * something like that.
 */
class MemoryQueue implements MessageQueue {
  private readonly _map = new Map<string, any[]>();

  async send(message: any, to: ID) {
    const messages = this._map.get(to) ?? [];
    this._map.set(to, [...messages, message]);
  }

  async pending(to: ID) {
    const messages = this._map.get(to) ?? [];
    this._map.set(to, []);
    return messages;
  }
}

let instance: MessageQueue; 
/**
 * Get an instance of a message queue to use.
 *
 * This will choose the right queue based on the environment.
 */
export async function getMessageQueue(): Promise<MessageQueue> {
  if (!instance) {
    instance = new MemoryQueue();
  }
  return instance;
}
