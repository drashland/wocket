export interface IPacket {
  /**
   * A property to hold an array of callbacks that should be executed with this
   * packet.
   */
  callbacks: Function[];

  /**
   * A property to hold the sender's ID.
   */
  from: number;

  /**
   * A property to hold the message this packet contains.
   */
  message: Uint8Array | string;

  /**
   * A property to hold the address this packet is going to.
   */
  to: string;
}

export interface ITransmitterOptions {
  /**
   * A property to determine number of ms to wait for a pong event before
   * closing a client connection.
   */
  ping_interval?: number;

  /**
   * A property to determine number of ms before sending a ping event to a
   * connected client.
   */
  ping_timeout?: number;

  /**
   * A property to set reconnect flag. If false, server will not ping client.
   */
  reconnect?: boolean;
}
