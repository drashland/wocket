export class SocketClient {
  constructor(options) {
    this.conn = null;
    this.options = {
      address: options.address || "127.0.0.1",
      port: options.port || "3000",
    };
    this.listening = {};
    this.messageQueue = [];
    this.ready = true;
    this.init(this.options);
  }

  getOptions() {
    return this.options;
  }

  init(options) {
    const { address, port } = options;
    this.conn = new WebSocket(`ws://${address}:${port}`);
    this.conn.addEventListener('open', () => {
      this.conn.addEventListener('message', (event) => {
        this.receiveEncodedMessage(event.data);
      });
    })
  }

  receiveEncodedMessage(encodedMessage) {
    encodedMessage.arrayBuffer().then(buffer => {
      const decodedMessage = new TextDecoder().decode(buffer);
      const parsedMessage = JSON.parse(decodedMessage);
      console.log(parsedMessage);
      Object.keys(parsedMessage).forEach((type) => {
        if (this.listening[type]) this.listening[type](parsedMessage[type]);
      })
    });
  }

  on(type, cb) {
    if (this.conn.readyState === 1) {
      if (!this.listening[type]) this.listening[type] = null;
      this.listening[type] = cb;
      const toSend = JSON.stringify({ listeningTo: type });
      const encoded = new TextEncoder().encode(toSend);
      this.messageQueue.push(encoded);
      this.emit();
      return;
    }

    setTimeout(() => this.on(type,cb), 5);
  }

  send(type, message) {
    let toSend = null;
    if (type) {
      const preparedString = JSON.stringify({ [type]: message });
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
        toSend = new Uint8Array(this.messageQueue[0].length)
        toSend.set(this.messageQueue.pop());
      }
      this.conn.send(toSend);
      this.ready = true;
      this.emit();
    }
  }
}
