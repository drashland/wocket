import { Server } from "./mod.ts";
import { WebSocketClient } from "./src/websocket_client.ts";

const server: Server = new Server();

// Run the server
server.runWs({
  hostname: "127.0.0.1",
  port: 5001,
});

console.log(
  `Server started on ws://${server.hostname}:${server.port}`,
);

// Example using the connect handler
server.on("connect", (e: CustomEvent) => {
  const { id } = e.detail
  console.log('server had a client connected: ' + id)
})

// Example using the disconnect handler
server.on("disconnect", (e: CustomEvent) => {
  const { id, code, reason } = e.detail
  console.log('server had a client disconnect:')
  console.log(id, code, reason)
})

// Example using generics + custom channel handler and getting the data from the event
type UserMessage = {
  username: string;
  sender: number;
  id: number // client socket id
};
server.on("channel", (event: CustomEvent<UserMessage>) => {
  console.log('got channel msg')
  const { username, sender, id } = event.detail
  
  // Example sending to all clients, specifying which channel it is for
  server.to("chat-message", {
    message: "yep, the server got your msg :)"
  })

  // example sending to a specific client TODO :: Pass socket id as first param?

  // example sending to all OTHER clients TODO :: broadcast?
});

const client = await WebSocketClient.create("ws://127.0.0.1:5001")
client.on<{ message: string}>("chat-message", (packet) => {
    const { message } = packet
    console.log('client got message:')
    console.log(message)
})
console.log('gonna send msg')
client.to("channel", {
    username: "darth vader",
    sender: 69
})