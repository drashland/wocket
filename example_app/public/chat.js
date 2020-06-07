import { SocketClient } from './client.js';
const socket = new SocketClient({});

const messagesContainer = document.getElementById('messages-container');
const messagesInRoom = document.getElementById('messages');
const submitMessageButton = document.getElementById('submitMessage');
const messageInput = document.getElementById('messageToSend');
const userInput = document.getElementById('username');

// client's socket is listening on the 'chat' event
socket.on('chat', (message) => {
  const messageString = `${message.username}: ${message.text}`;
  addMessageToChat(messageString);
});

const scrollToBottom = () => {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// appends message to messages container
const addMessageToChat = (messageString) => {
  const li = document.createElement('li');
  li.className = 'message';
  li.appendChild(document.createTextNode(messageString));
  messagesInRoom.appendChild(li);
  scrollToBottom();
}

// sends message to server
const sendMessage = () => {
  const username = userInput.value;
  if (!username) return alert("Enter username!");
  const message = messageInput.value;
  const messageString = `${username}: ${message}`;

  socket.send('chat', { username: username, text: message });
  messageInput.value = '';
  addMessageToChat(messageString);
  scrollToBottom();
}

// loads messages that are sent by server
const loadMessages = (messages) => {
  messagesInRoom.innerHTML = '';
  messages.forEach(message => {
    const messageString = `${message.username}: ${message.text}`;
    addMessageToChat(messageString);
  });
  scrollToBottom();
}

const init = () => {
  const url = 'http://localhost:8888/chat';
  fetch(url)
    .then(response => response.json())
    .then(messages => loadMessages(messages));
}

submitMessageButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keyup', (event) => {
  if (event.keyCode === 13) {
    event.preventDefault();
    sendMessage();
  }
});

init();
