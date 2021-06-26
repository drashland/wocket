/**
 * A callback to execute when a Channel object receives events.
 */
export type OnChannelCallback<T> = ((
  event: CustomEvent<T> | CustomEvent,
) => void);
