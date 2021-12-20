type Callback = (message: Record<string, unknown>) => void;

/**
 * A helper class to replace the native WebSocket, to make it simpler to
 * connect and disconnect from servers, and tailored towrads working specifically
 * with a Wocket server
 */
export class WebSocketClient extends WebSocket {
  #handlers: Map<string, Callback> = new Map();

  constructor(url: string) {
    super(url);
    this.onmessage = (e) => {
      const packet = JSON.parse(e.data);
      const { channel, message } = packet;
      const handler = this.#handlers.get(channel);
      if (handler) {
        handler(message);
      }
    };
  }

  /**
   * Register a listener for a channel name
   *
   * @param channelName - The channel name to listen on
   * @param cb - The handler
   *
   * @example
   * ```js
   * on<{ name: string }>("user", message => {
   *   console.log(message.user.name);
   * })
   * ```
   */
  public on<T extends Record<string, unknown>>(
    channelName: string,
    cb: (message: T) => void,
  ) {
    this.#handlers.set(channelName, cb as Callback);
  }

  /**
   * Send a message to the server
   *
   * @param channelName - The channel name to send to
   * @param message - The message to send to the channel
   */
  public to(channelName: string, message: Record<string, unknown>): void {
    if (this.readyState === WebSocket.CONNECTING) {
      return this.to(channelName, message);
    }
    const packet = JSON.stringify({
      channel: channelName,
      message,
    });
    this.send(packet);
  }
}
