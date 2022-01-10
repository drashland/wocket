import { deferred } from "../tests/deps.ts";

type Callback = (message: Record<string, unknown>) => void;

/**
 * A helper class to replace the native WebSocket, to make it simpler to
 * connect and disconnect from servers, and tailored towrads working specifically
 * with a Wocket server
 */
export class WebSocketClient {
  #socket: WebSocket;

  #handlers: Map<string, Callback> = new Map();

  constructor(socket: WebSocket) {
    this.#socket = socket;
    this.#socket.onmessage = (e) => {
      const packet = JSON.parse(e.data);
      const { channel, message } = packet;
      const handler = this.#handlers.get(channel);
      if (handler) {
        handler(message);
      }
    };
  }

  /**
   * Entrypoint to create the client.
   *
   * The same as:
   * ```js
   * const client = new Websocket(...)
   * const p = deferred()
   * client.onopen = () => p.resolve()
   * await p
   * ```
   *
   * @param url - URL for the websocket server, eg "ws://localhost:3000"
   *
   * @returns An instance of the WebSocketClient
   */
  public static async create(url: string) {
    const websocket = new WebSocket(url);
    const p = deferred();
    websocket.onopen = () => {
      p.resolve();
    };
    websocket.onerror = (e) => {
      // deno-lint-ignore ban-ts-comment
      // @ts-ignore
      throw new Error(e.message);
    };
    await p;
    websocket.onerror = null;
    return new WebSocketClient(websocket);
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
  public to(channelName: string, message: Record<string, unknown>) {
    const packet = JSON.stringify({
      channel: channelName,
      message,
    });
    this.#socket.send(packet);
  }

  /**
   * Close the websocket client
   */
  public async close() {
    const p = deferred();
    this.#socket.onclose = () => p.resolve();
    this.#socket.close();
    await p;
  }

  /**
   * Register a custom onerror callback
   *
   * @param callback - Function to be called if the client receives an error
   */
  public onerror(callback: (e: ErrorEvent | Event) => void | Promise<void>) {
    this.#socket.onerror = callback;
  }
}
