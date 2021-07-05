import SocketClient from "https://cdn.jsdelivr.net/gh/drashland/sockets-client@latest/client.js";

// Create a new socket client. This class comes from /public/client.js.
const socket = new SocketClient({
  hostname: SOCKET_SERVER.hostname,
  port: SOCKET_SERVER.port,
});

const messagesContainer = document.getElementById("messagesContainer");
const messagesInChannel = document.getElementById("messages");
const submitMessageButton = document.getElementById("submitMessage");
const messageInput = document.getElementById("messageToSend");
const userInput = document.getElementById("username");
const channelsDropdown = document.getElementById("channelsDropdown");
const createChannelName = document.getElementById("createChannelName");
const notificationBanner = document.getElementById("notification");

/**
 * Append a message to the specified channel's message container.
 *
 * @param {String} channel
 * @param {String} messageString
 */
const addMessageToChat = (channel, messageString) => {
  if (channel != channelsDropdown.value) {
    return;
  }
  const li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(messageString));
  messagesInChannel.appendChild(li);
  scrollToLastMessage();
};

/**
 * Fetch all channels from the server.
 */
const fetchChannels = async () => {
  console.log("Fetching channels.");
  const response = await fetch(
    `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "get_channels",
      }),
    },
  );
  if (response.status === 200) {
    const channels = await response.json();
    console.log(`Channels: ${channels.join(", ")}`);
    const value = channelsDropdown.value;
    channelsDropdown.innerHTML = "";
    channels.forEach((channel) => {
      // Don't add the following channels to the channels dropdown
      if (channel == "create_channel") {
        return;
      }
      // Create the option for the channel and add it to the channels dropdown
      const option = document.createElement("option");
      option.text = channel;
      option.value = channel;
      if (option.value == value) {
        option.selected = true;
      }
      channelsDropdown.add(option);
      listenToChannel(channel);
    });
  }
};

/**
 * Fetch the specified channel's messages from the server.
 *
 * @param {String} channelName
 */
const fetchMessages = async (channelName) => {
  const url =
    `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat/${channelName}`;
  const response = await fetch(url);
  const messages = await response.json();
  loadMessages(messages.length ? messages : []);
};

/**
 * Listen to the specified channel for any incoming messages.
 *
 * @param {String} channelName
 */
const listenToChannel = (channelName) => {
  socket.on(channelName, (message) => {
    const messageString = `${message.username}: ${message.text}`;
    addMessageToChat(channelName, messageString);
  });
};

/**
 * Load messages that are sent by the server.
 *
 * @param {Array} messages
 */
const loadMessages = (messages) => {
  messagesInChannel.innerHTML = "";
  if (Array.isArray(messages)) {
    messages.forEach((message) => {
      const messageString = `${message.username}: ${message.text}`;
      addMessageToChat(channelsDropdown.value, messageString);
    });
    scrollToLastMessage();
  }
};

/**
 * Scroll the messages container to its last message.
 */
const scrollToLastMessage = () => {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

/**
 * Send a message to the socket server.
 */
const sendMessage = () => {
  const username = userInput.value;
  if (!username) return alert("Enter username!");
  const message = messageInput.value;
  const messageString = `${username}: ${message}`;

  socket.to(
    channelsDropdown.value,
    { channel: channelsDropdown.value, username: username, text: message },
  );
  messageInput.value = "";
  addMessageToChat(channelsDropdown.value, messageString);
  scrollToLastMessage();
};

/**
 * Initialize this file.
 */
(async () => {
  await fetchMessages("Channel 1");
  await fetchChannels();
  // Listen for when channels are created
  socket.on("create_channel", async (message) => {
    createChannelName.value = "";
    notificationBanner.style.visibility = "visible";
    notificationBanner.innerHTML = message.text;
    setTimeout(() => notificationBanner.style.visibility = "hidden", 1000);

    await fetchChannels();
  });
})();

submitMessageButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keyup", (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendMessage();
  }
});
