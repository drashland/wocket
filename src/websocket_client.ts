type Callback = (message: Record<string, unknown>) => void;

/**
 * A helper class built on top of the native WebSocket, to make it easier to
 * send messages to channels, and listen for messages on channels.
 *
 * Specifically built for Drash.
 *
 * Only defined an onmessage handler.
 */
export class WebSocketClient extends WebSocket {
  #handlers: Map<string, Callback> = new Map();

  constructor(url: string) {
    super(url);
    this.onmessage = (e) => {
      try {
        const packet = JSON.parse(e.data);
        const { channel, message } = packet;
        const handler = this.#handlers.get(channel);
        if (handler) {
          handler(message);
        }
      } catch (err) {
        if (err instanceof SyntaxError && typeof e.data === "string") { // problem parsing the message, will be us sending an error message
          throw new Error(e.data);
        }
        throw err;
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
  public to(
    channelName: string,
    message: Record<string, unknown> | string | Uint8Array,
  ): void {
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
