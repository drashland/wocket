/**
 * @description
 *    This SocketClient uses native WebSocket. It starts a connection and handles messages with the
 *    socket server.
 */
class SocketClient {
  constructor(options) {
    this.configs = {
      hostname: options.hostname || "localhost",
      port: options.port || "3000",
    };
    this.listening = {};
    this.message_queue = [];
    this.ready = true;
    this.connection = new WebSocket(
      `ws://${this.configs.hostname}:${this.configs.port}`,
    );
    this.connection.addEventListener("message", (event) => {
      this.handleEncodedMessage(event.data);
    });
    return this;
  }

  handleEncodedMessage(encodedMessage) {
    encodedMessage.arrayBuffer().then((buffer) => {
      const decodedMessage = new TextDecoder().decode(buffer);
      const parsedMessage = JSON.parse(decodedMessage);
      Object.keys(parsedMessage).forEach((channelOrEvent) => {
        if (this.listening[channelOrEvent]) {
          this.listening[channelOrEvent](parsedMessage[channelOrEvent]);
        }
      });
    });
  }

  on(channelOrEvent, cb) {
    if (this.connection.readyState === 1) {
      if (!this.listening[channelOrEvent]) {
        this.listening[channelOrEvent] = null;
      }
      this.listening[channelOrEvent] = cb;
      const message = JSON.stringify({ listening_to: channelOrEvent });
      const encoded = new TextEncoder().encode(message);
      this.message_queue.push(encoded);
      this.sendMessagesToServer();
    } else {
      setTimeout(() => this.on(channelOrEvent, cb), 5);
    }
  }

  sendMessagesToServer() {
    if (this.ready && this.message_queue.length) {
      this.ready = false;
      let message = null;
      while (this.message_queue.length) {
        message = new Uint8Array(this.message_queue[0].length);
        message.set(this.message_queue.pop());
      }
      this.connection.send(message);
      this.ready = true;
      this.sendMessagesToServer();
    }
  }

  send(channelOrEvent, message) {
    if (channelOrEvent) {
      message = JSON.stringify({ [channelOrEvent]: message });
      message = new TextEncoder().encode(message);
    }
    this.message_queue.push(message);
    this.sendMessagesToServer();
  }
}
