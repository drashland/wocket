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

/**
 * Scroll the messages container to its last message.
 */
const scrollToLastMessage = () => {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

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
 * Change the current channel to the channel specified and load the channel's messages
 *
 * @param {String} channelName
 */
const changeChannel = async (channelName) => {
  console.log(`Changing channel to "${channelName}".`);
  await fetchMessages(channelName);
};

/**
 * Create a new channel by sending a request to the web server, which will tell the socket server to
 * create a new channel.
 */
const createChannel = async () => {
  if (createChannelName.value.trim() == "") {
    alert("Channel name is required!");
    return;
  }
  console.log("Creating channel.");
  const response = await fetch(
    `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create_channel",
        channel_name: createChannelName.value,
      }),
    },
  );
  if (response.status === 200) {
    console.log("Channel created.");
    let option = document.createElement("option");
    option.text = createChannelName.value;
    option.value = createChannelName.value;
    channelsDropdown.add(option);
    listenToChannel(createChannelName.value);
  }
};

/**
 * Send a message to the socket server.
 */
const sendMessage = () => {
  const username = userInput.value;
  if (!username) return alert("Enter username!");
  const message = messageInput.value;
  const messageString = `${username}: ${message}`;

  socket.send(
    channelsDropdown.value,
    { channel: channelsDropdown.value, username: username, text: message },
  );
  messageInput.value = "";
  addMessageToChat(channelsDropdown.value, messageString);
  scrollToLastMessage();
};

// loads messages that are sent by server
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

const fetchMessages = async (channel) => {
  const url =
    `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat/${channel}`;
  const response = await fetch(url);
  const messages = await response.json();
  loadMessages(messages.length ? messages : []);
};

const fetchChannels = async () => {
  const url = `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat`;
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
      let option = document.createElement("option");
      option.text = channel;
      option.value = channel;
      if (option.value == value) {
        option.selected = true;
      }
      channelsDropdown.add(option);
      listenToChannel(channel);
    });
  } else {
    alert("There was an error creating the channel!");
  }
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
 * Initialize this file.
 */
const init = async () => {
  await fetchMessages("Channel 1");
  await fetchChannels();
  socket.on("create_channel", async (message) => {
    alert(message);
    await fetchChannels();
  });
};

submitMessageButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keyup", (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendMessage();
  }
});

init();
