import { SocketClient } from "../../mod.ts";
import { green } from "../../deps.ts";

const ioClient = new SocketClient({ port: 3000 });
ioClient.initConsole('chatroom1');
const io = await ioClient.attach();

io.on('chatroom1', (incomingMessage) => {
  console.log(green(`Incoming message: ${incomingMessage}`));
});
