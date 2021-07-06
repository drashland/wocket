import { Server } from "./mod.ts";

const server: Server = new Server();

// Run the server
server.runWs({
  hostname: "127.0.0.1",
  port: 5001,
});

console.log(
  `Server started on ws://${server.hostname}:${server.port}`,
);

server.on("connect", () => {
  console.log('server had a client connected')
})

server.on("disconnect", () => {
  console.log('server had a client disconnect')
})

type UserMessage = {
  username: string;
  sender: number;
};
server.on("channel", (event: CustomEvent<UserMessage>) => { // TODO :: Need to pass in client id id
  console.log('got channel msg')
  console.log(event); // Exists
  server.to("chat-message", {
    message: "yep, the server got your msg :)"
  }) // support sending to clients in a channel EXCEPT the sender, and also only the sender
});

const client = new WebSocket("ws://127.0.0.1:5001")
client.onmessage = (e) => {
  console.log('GOT MSG on client:')
    console.log(e.data)
}
client.onerror = (e) => console.log(e)
client.onopen = () => {
    console.log('open')
    client.send(JSON.stringify({
        channel: "channel",
        message: {
          username: "darth vader",
          sender: 69
        }
    }))
}
client.onmessage = (e) => {
  console.log('client got msg:')
  const data = JSON.parse(e.data)
  const { channel, message } = data
  console.log(channel, message)
}
