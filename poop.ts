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

// Example using generics + custom channel handler
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

const client = new WebSocket("ws://127.0.0.1:5001")
client.onmessage = (e) => {
  console.log('GOT MSG on client:')
    console.log(e.data)
}
client.onerror = (e) => console.log(e)
client.onopen = () => {
    console.log('open')
    // send a message to the server that *coudl* be listening on a channel handler
    client.send(JSON.stringify({
        channel: "channel",
        message: {
          username: "darth vader",
          sender: 69
        }
    }))
}
client.onmessage = (e) => {
  // and this is how we parse the data
  console.log('client got msg:')
  const data = JSON.parse(e.data)
  const { channel, message } = data as { channel: string, message: unknown}
  console.log(channel, message)
}
