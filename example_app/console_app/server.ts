import { SocketServer } from "../../mod.ts";

const io = new SocketServer();

io.on('chatroom1', (incomingMessage) => {
  io.to('chatroom1', incomingMessage);
});
