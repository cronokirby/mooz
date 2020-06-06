import { uuid } from 'uuidv4';

/**
 * Represents a unique identifier for some client.
 *
 * This is just some tag we can use to route messages to a specific user.
 */
export type ID = string & { readonly __tag: unique symbol };

/**
 * Create a new unique identifier.
 */
export function newID(): ID {
  return uuid() as ID;
}
