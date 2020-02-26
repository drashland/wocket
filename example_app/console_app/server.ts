import { SocketServer } from "../../mod.ts";

const io = new SocketServer();

io.on('chatroom1', function (incomingMessage) {
  io.to('chatroom1', incomingMessage);
});
