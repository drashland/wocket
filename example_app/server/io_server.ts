import config from "../config.ts";

export default class IO {
  public io: any;
  public messages: any;

  constructor(SocketServer: any) {
    this.io = this.init(SocketServer)
    console.log(`Socket server started on ${config.hostname}:${config.socketPort}`);
    this.messages = [];

    this.io.on('connection', () => {
      console.log('A user connected.');
    });
    
    this.io.on('chat', (incomingEvent: any) => {
      const { message } = incomingEvent;

      this.messages.push({ ...message });
      this.io.to('chat', incomingEvent);
    });
    
    this.io.on('disconnect', () => {
      console.log('A user disconnected.');
    });
  }
  
  init(SocketServer: any) {
    return new SocketServer({
      address: config.hostname,
      port: config.socketPort
    });
  }
}
