type Return<T> = "connect" instanceof T ? { id: number, message: string }
  : "disconnect" extends T ? { id: number; code: number; reason: string }
  : { id: number };

/**
 * A callback to execute when a Channel object receives events.
 */
export type OnChannelCallback<T, C> = ((
  event: CustomEvent<T & Return<C>>,
) => void);
