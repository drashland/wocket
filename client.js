/**
 * @description
 *    This SocketClient class uses the native WebSocket object to create a connection to a socket
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
 *    private, these methods are mainly for the SocketClient class' use.
 *
 *    Helpful links:
 *    - Learn more about the WebSocket API at the following address:
 *          https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
 *    - Learn more about writing web socket client applications at the following address:
 *          https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications
 */
class SocketClient {
  /**
   * @description
   *     Construct an object of this class.
   *
   * @return {SocketClient}
   */
  constructor(options) {
    this.configs = {
      hostname: options.hostname || "localhost",
      port: options.port || "3000",
      protocol: options.protocol || "ws",
    };
    this.decoder = new TextDecoder();
    this.listening_to = {};
    this.message_queue = [];
    this.ready = true;

    this._connectToSocketServer();
    this._listenToSocketServerMessages();

    return this;
  }

  // FILE MARKER - METHODS FOR PUBLIC USE //////////////////////////////////////////////////////////

  /**
   * @description
   *     On receipt of a message in the following channel or on the following event, perform the
   *     specified callback.
   *
   * @param {String} channelOrEvent
   *     The name of the channel or event.
   * @param {Function} callback
   *     The callback to execute on receipt of a message from the channel or event.
   */
  on(channelOrEvent, callback) {
    if (this.connection.readyState === 1) {
      if (!this.listening_to[channelOrEvent]) {
        this.listening_to[channelOrEvent] = null;
      }
      this.listening_to[channelOrEvent] = callback;
      const message = JSON.stringify({ listening_to: channelOrEvent });
      const encoded = new TextEncoder().encode(message);
      this.message_queue.push(encoded);
      this._sendMessagesToSocketServer();
    } else {
      setTimeout(() => this.on(channelOrEvent, callback), 5);
    }
  }

  /**
   * @description
   *     Send a message to a channel or an event.
   *
   * @param {String} channelOrEvent
   *     The name of the channel or event.
   * @param {String} message
   *     The message to send to the channel or event.
   */
  to(channelOrEvent, message) {
    if (channelOrEvent) {
      message = JSON.stringify({ [channelOrEvent]: message });
      message = new TextEncoder().encode(message);
    }
    this.message_queue.push(message);
    this._sendMessagesToSocketServer();
  }

  // FILE MARKER - METHODS FOR INTERNAL USE ////////////////////////////////////////////////////////

  /**
   * Connect to the socket server at the hostname and port specified in the configs.
   */
  _connectToSocketServer() {
    this.connection = new WebSocket(
      `ws://${this.configs.hostname}:${this.configs.port}`,
    );
  }

  /**
   * @description
   *     Listen to messages from sent by the socket server.
   */
  _listenToSocketServerMessages() {
    this.connection.addEventListener("message", (event) => {
      this._handleEncodedMessage(event.data);
    });
  }

  /**
   * @description
   *     All messages received by the socket server will be handled by this method.
   *
   * @param {Body}
   *     The encoded message. See https://developer.mozilla.org/en-US/docs/Web/API/Body for more
   *     information about the Body mixin.
   */
  _handleEncodedMessage(encodedMessage) {
    encodedMessage.arrayBuffer().then((buffer) => {
      const decodedMessage = this.decoder.decode(buffer);
      const parsedMessage = JSON.parse(decodedMessage);
      Object.keys(parsedMessage).forEach((channelOrEvent) => {
        if (this.listening_to[channelOrEvent]) {
          this.listening_to[channelOrEvent](parsedMessage[channelOrEvent]);
        }
      });
    });
  }

  /**
   * @description
   *     Send all messages in the message queue to the socket server.
   */
  _sendMessagesToSocketServer() {
    if (this.ready && this.message_queue.length) {
      this.ready = false;
      let message = null;
      while (this.message_queue.length) {
        message = new Uint8Array(this.message_queue[0].length);
        message.set(this.message_queue.pop());
      }
      this.connection.send(message);
      this.ready = true;
      this._sendMessagesToSocketServer();
    }
  }
}
