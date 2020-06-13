/**
 * @description
 *    This SocketClient uses native WebSocket.
 *    It starts a connection and handles messages with the socket server.
 */

class SocketClient {
  constructor(options) {
    this.conn = null;
    this.options = {
      hostname: options.hostname || "localhost",
      port: options.port || "3000",
    };
    this.listening = {};
    this.messageQueue = [];
    this.ready = true;
    this.init(this.options);
    return this;
  }

  getOptions() {
    return this.options;
  }

  init(options) {
    const { hostname, port } = options;
    this.conn = new WebSocket(`ws://${hostname}:${port}`);
    this.conn.addEventListener("message", (event) => {
      this.receiveEncodedMessage(event.data);
    });
  }

  checkReadyState() {
    return this.conn.readyState === 1;
  }

  receiveEncodedMessage(encodedMessage) {
    encodedMessage.arrayBuffer().then((buffer) => {
      const decodedMessage = new TextDecoder().decode(buffer);
      const parsedMessage = JSON.parse(decodedMessage);

      Object.keys(parsedMessage).forEach((eventName) => {
        if (this.listening[eventName]) {
          this.listening[eventName](parsedMessage[eventName]);
        }
      });
    });
  }

  on(eventName, cb) {
    if (this.checkReadyState()) {
      if (!this.listening[eventName]) this.listening[eventName] = null;
      this.listening[eventName] = cb;
      const toSend = JSON.stringify({ listening_to: eventName });
      const encoded = new TextEncoder().encode(toSend);
      this.messageQueue.push(encoded);
      this.emit();
    } else {
      setTimeout(() => this.on(eventName, cb), 5);
    }
  }

  send(eventName, message) {
    let toSend = null;
    if (eventName) {
      const preparedString = JSON.stringify({ [eventName]: message });
      toSend = new TextEncoder().encode(preparedString);
    } else {
      toSend = message;
    }
    this.messageQueue.push(toSend);
    this.emit();
  }

  emit() {
    if (this.ready && this.messageQueue.length) {
      this.ready = false;
      let toSend = null;
      while (this.messageQueue.length) {
        toSend = new Uint8Array(this.messageQueue[0].length);
        toSend.set(this.messageQueue.pop());
      }
      this.conn.send(toSend);
      this.ready = true;
      this.emit();
    }
  }
}
