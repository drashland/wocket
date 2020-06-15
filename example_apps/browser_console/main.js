// Create the connection between this socket client and the socket server.
const socketClient = new SocketClient({
  hostname: "localhost",
  port: 3000,
});

// When the socket server starts, it creates a channel named "Channel 1", so
// we set this socket client up to listen to that channel here. Any messages
// sent by the socket server to "Channel 1" will be handled by the callback
// below.
socketClient.on("Channel 1", (incomingMessage) => {
  console.log(
    "Message received from the server: " + JSON.stringify(incomingMessage),
  );
  const messages = document.getElementById("messages");
  const li = document.createElement("li");
  li.appendChild(document.createTextNode(incomingMessage.text));
  messages.appendChild(li);
});
