// Create a new socket client. This class comes from /public/client.js.
const socket = new SocketClient({
  hostname: SOCKET_SERVER.hostname,
  port: SOCKET_SERVER.port,
});

const messagesContainer = document.getElementById("messages-container");
const messagesInChannel = document.getElementById("messages");
const submitMessageButton = document.getElementById("submitMessage");
const messageInput = document.getElementById("messageToSend");
const userInput = document.getElementById("username");
const channelsDropdown = document.getElementById("channels-dropdown");
const createChannelName = document.getElementById("create-channel-name");

const scrollToBottom = () => {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// appends message to messages container
const addMessageToChat = (channel, messageString) => {
  if (channel != channelsDropdown.value) {
    return;
  }
  const li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(messageString));
  messagesInChannel.appendChild(li);
  scrollToBottom();
};

// Change the current channel to the channel specified and load the channel's messages
const changeChannel = async (value) => {
  console.log(`Changing channel to "${value}".`);
  await fetchChat(value);
};

// Create a new channel by sending a request to the web server, which will tell the socket server to
// create a new channel.
const createChannel = async () => {
  if (createChannelName.value.trim() == "") {
    alert("Channel name is required!");
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

// sends message to server
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
  scrollToBottom();
};

// loads messages that are sent by server
const loadMessages = (messages) => {
  messagesInChannel.innerHTML = "";
  if (Array.isArray(messages)) {
    messages.forEach((message) => {
      const messageString = `${message.username}: ${message.text}`;
      addMessageToChat(channelsDropdown.value, messageString);
    });
    scrollToBottom();
  }
};

const fetchChat = async (channel) => {
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
      let option = document.createElement("option");
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

const listenToChannel = (channel) => {
  socket.on(channel, (message) => {
    const messageString = `${message.username}: ${message.text}`;
    addMessageToChat(channel, messageString);
  });
};

const init = async () => {
  await fetchChat("Channel 1");
  await fetchChannels();
};

submitMessageButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keyup", (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendMessage();
  }
});

init();
