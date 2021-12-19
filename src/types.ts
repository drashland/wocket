type Return<T> = T extends "connect" ? { id: number }
  : T extends "disconnect" ? { id: number; code: number; reason: string }
  : { id: number };

/**
 * A callback to execute when a Channel object receives events.
 */
export type OnChannelCallback<T, ChannelName extends string> = ((
  event: CustomEvent<T & Return<ChannelName>>,
) => void);
