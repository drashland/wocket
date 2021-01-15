import { deferred } from "../../tests/deps.ts";

interface Configs {
  hostname: string;
  port: number;
  reconnect: boolean;
  protocol: string;
}
//
// interface Options {
//   hostname?: string,
//   port?: number,
//   reconnect?: boolean,
//   protocol?: string
// }

interface Options {
  hostname?: string;
  port?: number;
  protocol?: "ws" | "wss";
  path?: string;
}

export class WocketClient {
  public websocket: WebSocket | null = null;

  public listeners: Record<string, (data: Record<string, unknown>) => void> =
    {};

  constructor() {
  }

  public async connect(opts: Options, channels: string[]): Promise<void> {
    if (!opts.hostname) opts.hostname = "localhost";
    if (!opts.port) opts.port = 3000;
    if (!opts.protocol) opts.protocol = "ws";
    if (!opts.path) opts.path = "";

    // Connect
    const connected = deferred();
    const url = `${opts.protocol}://${opts.hostname}:${opts.port}${opts.path}`;
    this.websocket = new WebSocket(url);
    this.websocket.onopen = function () {
      connected.resolve();
    };
    this.websocket.onerror = function () {
      throw new Error("Error.. todo");
    };
    await connected;

    // Connect to channels
    if (!channels.length) {
      throw new Error("You must specify channels to connect to.");
    }
    const channelsSetup = deferred();
    let channelsConnectedTo = 0;
    let error: string | null = null;
    this.websocket.onmessage = function (event) {
      if (
        typeof event.data === "string" && event.data.includes("Connected to")
      ) {
        channelsConnectedTo++;
        if (channels.length === channelsConnectedTo) {
          channelsSetup.resolve();
        }
      } else if (
        event.data.includes("Channel") && event.data.includes("does not exist.")
      ) {
        error = `${event.data} You must open this on your server.`;
        channelsSetup.resolve(); // resolving as we are done here, we will throw an error
      }
    };
    this.websocket.send(JSON.stringify({
      connect_to: channels,
    }));
    await channelsSetup;
    if (error) {
      throw new Error(error);
    }

    // initialise message listener
    this.websocket.onmessage = (event) => {
      const json = JSON.parse(event.data);
      const channel = json.to;
      const from = json.from;
      const message = json.message;
      if (this.listeners[channel]) {
        this.listeners[channel](message);
      }
    };
  }

  public to(channel: string, data: Record<string, unknown>): void {
    const message = {
      // deno-lint-ignore camelcase
      send_packet: {
        to: channel,
        message: data,
      },
    };
    const msgStr = JSON.stringify(message);
    this.websocket!.send(msgStr);
  }

  public on(
    channel: string,
    cb: (data: Record<string, unknown>) => void,
  ): void {
    this.listeners[channel] = cb;
  }

  public async close() {
    const p = deferred();
    this.websocket!.onclose = function () {
      p.resolve();
    };
    this.websocket!.close();
    await p;
  }
}

/**
 * @description
 *    This WocketClient class uses the native WebSocket object to create a connection to a socket
 *    server. It creates a connection, handles messages received from the socket server, and can
 *    send messages to the socket server it is connected to.
 *
 *    There are two methods that allow this class to interact with the socket server it is connected
 *    to. Those methods are:
 *
 *        - on(); and
 *        - to()
 *
 *    Use these methods to interact with the connected socket server.
 *
 *    There are methods in this class that are prefixed with an underscore. A method prefixed with
 *    an underscore means it is not meant to be used publicly. Although these methods are not
 *    private, these methods are mainly for the WocketClient class' use.
 *
 *    Helpful links:
 *    - Learn more about the WebSocket API at the following address:
 *          https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 *    - Learn more about writing web socket client applications at the following address:
 *          https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
 */
// export default class WocketClient {
//   /**
//    * Configs for the client
//    */
//   public readonly configs: Configs;
//
//   public readonly decoder: TextDecoder
//
//   /**
//    * Keep track of how many times we reconnect
//    */
//   public reconnectCount: number;
//
//   /**
//    * What channels we are listening to
//    */
//   public listening_to: Record<string, (data: Record<string, unknown>) => void>
//
//   /**
//    * Queue to hold the messages, to eventually fire off
//    */
//   public message_queue: Uint8Array[]
//
//   /**
//    * Is the connection ready?
//    */
//   public ready: boolean
//
//   /**
//    * The connected client
//    */
//   public connection: WebSocket | null = null;
//
//   private wait_to_connect_to_channels: any = {}
//
//   /**
//    * @description
//    *     Construct an object of this class.
//    */
//   constructor(options: Options) {
//     this.configs = {
//       hostname: options.hostname || "localhost",
//       port: options.port || 3000,
//       reconnect: options.reconnect ?? true,
//       protocol: options.protocol || "ws",
//     };
//     this.decoder = new TextDecoder();
//     this.reconnectCount = 0;
//     this.listening_to = {};
//     this.message_queue = [];
//     this.ready = true;
//   }
//
//   public async connect() {
//     await this._connectToSocketServer()
//     this._listenToSocketClientEvents()
//   }
//
//   // FILE MARKER - METHODS FOR PUBLIC USE //////////////////////////////////////////////////////////
//
//   /**
//    * @description
//    *     On receipt of a message in the following channel or on the following event, perform the
//    *     specified callback.
//    *
//    * @param {String} channelOrEvent
//    *     The name of the channel or event.
//    * @param {Function} callback
//    *     The callback to execute on receipt of a message from the channel or event.
//    */
//   public on(channelOrEvent: string, callback: (data: Record<string, unknown>) => void) {
//     if (this._isClientReady()) {
//       // if (!this.listening_to![channelOrEvent]) {
//       //   this.listening_to[channelOrEvent] = null;
//       // }
//       this.listening_to[channelOrEvent] = callback;
//       const message = JSON.stringify({ connect_to: [channelOrEvent] });
//       const encoded = new TextEncoder().encode(message);
//       this.message_queue.push(encoded);
//       this._sendMessagesToSocketServer();
//     } else {
//       setTimeout(() => this.on(channelOrEvent, callback), 5);
//     }
//   }
//
//   /**
//    * @description
//    *     Send a message to a channel or an event.
//    *
//    * @param {String} channelOrEvent
//    *     The name of the channel or event.
//    * @param {String} message
//    *     The message to send to the channel or event.
//    */
//   public to(channelOrEvent: string, message: {[key: string]: unknown} | Event): void {
//     const messageString = JSON.stringify({
//       send_packet: {
//         to: channelOrEvent,
//         message: message
//       }
//     });
//     const encodedMessage = new TextEncoder().encode(messageString);
//     this.message_queue.push(encodedMessage);
//     this._sendMessagesToSocketServer();
//   }
//
//   public async close() {
//     this.configs.reconnect = false
//     const p = deferred()
//     this.connection!.onclose = function () {
//       p.resolve()
//     }
//     this.connection!.close()
//     await p
//   }
//
//   // FILE MARKER - METHODS FOR INTERNAL USE ////////////////////////////////////////////////////////
//
//   /**
//    * Check if connection is ready for events.
//    */
//   private _isClientReady(): boolean {
//     return this.connection!.readyState === 1;
//   }
//
//   private _reconnectSuccessful(previousId: number): void {
//     this.reconnectCount += 1;
//     // server can react if needed to this connection id
//     this.to("reconnect", {
//       previousId,
//       //id: this.connection.id,
//       reconnectCount: this.reconnectCount,
//     });
//   }
//
//   /**
//    * Connect to the socket server at the hostname and port specified in the configs.
//    */
//   private async _connectToSocketServer(reconnect?: boolean) {
//     //const previousId = reconnect ? this.connection.id : null;
//     this.connection = new WebSocket(
//         `${this.configs.protocol}://${this.configs.hostname}:${this.configs.port}`,
//     );
//     const p = deferred()
//     this.connection.onopen = function () {
//       p.resolve()
//     }
//     await p
//
//     //if (previousId) {
//     //  this._reconnectSuccessful(previousId);
//     //}
//     //this._listenToSocketClientEvents();
//   }
//
//   /**
//    * @description
//    *     Listen to events attached to the client.
//    */
//   private _listenToSocketClientEvents() {
//     this.connection!.addEventListener("message", (event) => {
//       if (typeof event.data === "string" && event.data.indexOf("Connected to") >= 0) {
//
//       }
//       console.log('got msgL ' + event.data)
//       this._handleEncodedMessage(event.data);
//     });
//     this.connection!.addEventListener("error", (event) => {
//       // send error message to server
//       this.to("error", event);
//     });
//     this.connection!.addEventListener("close", () => {
//       if (this.configs.reconnect === true) {
//         this._connectToSocketServer(true);
//       }
//     });
//   }
//
//   /**
//    * @description
//    *     All messages received by the socket server will be handled by this method.
//    *
//    * @param message
//    *     The encoded message. See https://developer.mozilla.org/en-US/docs/Web/API/Body for more
//    *     information about the Body mixin.
//    */
//   private _handleEncodedMessage(message: string | Body) {
//     if (typeof message === "string" && message === "ping") {
//       this._pongServer();
//     } else if (typeof message === "object") {
//       message.arrayBuffer().then((buffer: ArrayBuffer) => {
//         const decodedMessage = this.decoder.decode(buffer);
//         const parsedMessage = JSON.parse(decodedMessage);
//         Object.keys(parsedMessage).forEach((channelOrEvent) => {
//           if (this.listening_to[channelOrEvent]) {
//             this.listening_to[channelOrEvent](parsedMessage[channelOrEvent]);
//           }
//         });
//       });
//     }
//   }
//
//   /**
//    * @description
//    *     Send all messages in the message queue to the socket server.
//    */
//   private _sendMessagesToSocketServer(): void {
//     if (this._isClientReady() && this.ready && this.message_queue.length) {
//       this.ready = false;
//       this.connection!.send(new TextDecoder().decode(this.message_queue.pop()));
//       this.ready = true;
//       this._sendMessagesToSocketServer();
//     }
//   }
//
//   /**
//    * @description
//    *     Send pong message to server.
//    */
//   private _pongServer(): void {
//     this.connection!.send("pong");
//   }
// }
