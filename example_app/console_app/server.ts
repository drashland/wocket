import { SocketServer } from "../../mod.ts";

const io = new SocketServer();

io.on('connection', () => {
  console.log('A user connected.');
});

io.on('chatroom1', function (incomingMessage: any) {
  io.to('chatroom1', incomingMessage);
});

io.on('disconnect', () => {
  console.log('A user disconnected.');
});
