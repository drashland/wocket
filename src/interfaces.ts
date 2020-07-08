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
  reconnect?: boolean
}


