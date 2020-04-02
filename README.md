<p align="center">
  <a href="https://drash.io">
    <img height="200" src="https://raw.githubusercontent.com/drashland/sockets-website/master/public/assets/img/sockets.png" alt="Sockets">
  </a>
  <h1 align="center">Sockets</h1>
</p>
<p align="center">A WebSocket library for <a href="https://github.com/denoland/deno">Deno</a>.</p>
<p align="center">
  <a href="https://discord.gg/SgejNXq">
    <img src="https://img.shields.io/badge/chat-on%20discord-blue">
  </a>
  <a href="https://twitter.com/drash_land">
    <img src="https://img.shields.io/twitter/url?label=%40drash_land&style=social&url=https%3A%2F%2Ftwitter.com%2Fdrash_land">
  </a>
</p>

---

## Getting Started

### Console Chatroom

```typescript
// File: server.ts

import { SocketServer } from "../../mod.ts";

const io = new SocketServer();

io.on('connection', () => {
  console.log('A user connected.');
});

io.on('chatroom1', function (incomingMessage: any) {
  io.to('chatroom1', incomingMessage);
});

io.on('disconnect', () => {
  console.log('A user disconnected.');
});
```

```typescript
// File: client.ts
import { SocketClient } from "../../mod.ts";
import { green } from "../../deps.ts";

const ioClient = new SocketClient({ port: 3000 });
// inits a chat console
ioClient.initConsole('chatroom1');
const io = await ioClient.attach();

io.on('chatroom1', (incomingMessage: any) => {
  console.log(green(`Incoming message: ${incomingMessage}`));
});
```

```
$ deno --allow-net --allow-env server.ts
```

```
$ deno --allow-net --allow-env client.ts
```

Start sending messages to the server. To connect more clients, open additional sessions to connect to existing server.

## Features

- Binary-support

## Testing
```
$ deno --allow-net --allow-env tests/test.ts
```

## What to expect

- Auto-reconnection support
