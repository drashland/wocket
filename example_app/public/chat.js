// Create a new socket client. This class comes from /public/client.js.
const socket = new SocketClient({
  hostname: SOCKET_SERVER.hostname,
  port: SOCKET_SERVER.port,
});

const messagesContainer = document.getElementById("messages-container");
const messagesInRoom = document.getElementById("messages");
const submitMessageButton = document.getElementById("submitMessage");
const messageInput = document.getElementById("messageToSend");
const userInput = document.getElementById("username");
const roomsDropdown = document.getElementById("rooms-dropdown");
const createRoomName = document.getElementById("create-room-name");

const scrollToBottom = () => {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// appends message to messages container
const addMessageToChat = (room, messageString) => {
  if (room != roomsDropdown.value) {
    return;
  }
  const li = document.createElement("li");
  li.className = "message";
  li.appendChild(document.createTextNode(messageString));
  messagesInRoom.appendChild(li);
  scrollToBottom();
};

// Change the current room to the room specified and load the messages of the specified room
const changeRoom = async (value) => {
  console.log(`Changing room to "${value}".`);
  await fetchChat(value);
};

// Create a new room by sending a request to the web server, which will tell the socket server to
// create a new room (aka Plug)
const createRoom = async () => {
  if (createRoomName.value.trim() == "") {
    alert("Room name is required!");
  }
  console.log("Creating room");
  const response = await fetch(`http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "create_room",
      room_name: createRoomName.value
    })
  });
  if (response.status === 200) {
    console.log("Room created.");
    let option = document.createElement("option");
    option.text = createRoomName.value;
    option.value = createRoomName.value;
    roomsDropdown.add(option);
    listenToRoom(createRoomName.value);
  }
};

// sends message to server
const sendMessage = () => {
  const username = userInput.value;
  if (!username) return alert("Enter username!");
  const message = messageInput.value;
  const messageString = `${username}: ${message}`;

  socket.send(roomsDropdown.value, { room: roomsDropdown.value, username: username, text: message });
  messageInput.value = "";
  addMessageToChat(roomsDropdown.value, messageString);
  scrollToBottom();
};

// loads messages that are sent by server
const loadMessages = (messages) => {
  messagesInRoom.innerHTML = "";
  if (Array.isArray(messages)) {
    messages.forEach((message) => {
      const messageString = `${message.username}: ${message.text}`;
      addMessageToChat(roomsDropdown.value, messageString);
    });
    scrollToBottom();
  }
};

const fetchChat = async (room) => {
  const url = `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat/${room}`;
  const response = await fetch(url)
  const messages = await response.json();
  loadMessages(messages.length ? messages : []);
};

const fetchRooms = async () => {
  const url = `http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat`;
  console.log("Fetching rooms");
  const response = await fetch(`http://${WEB_SERVER.hostname}:${WEB_SERVER.port}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      action: "get_rooms",
    })
  });
  if (response.status === 200) {
    const rooms = await response.json();
    console.log(`Rooms: ${rooms.join(", ")}`);
    const value = roomsDropdown.value;
    roomsDropdown.innerHTML = "";
    rooms.forEach((room) => {
      let option = document.createElement("option");
      option.text = room;
      option.value = room;
      if (option.value == value) {
        option.selected = true;
      }
      roomsDropdown.add(option);
      listenToRoom(room);
    });
  }
};

const listenToRoom = (room) => {
  socket.on(room, (message) => {
    const messageString = `${message.username}: ${message.text}`;
    addMessageToChat(room, messageString);
  });
};

const init = async () => {
  await fetchChat("General");
  await fetchRooms();
};

submitMessageButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keyup", (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendMessage();
  }
});


init();
