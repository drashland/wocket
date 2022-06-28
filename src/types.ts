type AlwaysProps = {
  id: number;
};

type ReservedChannelProps<ChannelName> = ChannelName extends "connect"
  ? { queryParams: URLSearchParams }
  : ChannelName extends "disconnect" ? { code: number; reason: string }
  : Record<never, never>;

/**
 * A callback to execute when a Channel object receives events.
 */
export type OnChannelCallback<CustomProps, ChannelName extends string> = (
  event: CustomEvent<
    { packet: CustomProps } & ReservedChannelProps<ChannelName> & AlwaysProps
  >,
) => void;
