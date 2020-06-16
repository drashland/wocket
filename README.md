<p align="center">
  <a href="https://drash.io">
    <img height="200" src="logo.svg" alt="Sockets">
  </a>
  <h1 align="center">Sockets</h1>
</p>
<p align="center">A WebSocket library for <a href="https://github.com/denoland/deno">Deno</a>.</p>
<p align="center">
  <a href="https://github.com/drashland/sockets/actions">
    <img src="https://img.shields.io/github/workflow/status/drashland/sockets/master?label=ci">
  </a>
  <a href="https://discord.gg/SgejNXq">
    <img src="https://img.shields.io/badge/chat-on%20discord-blue">
  </a>
  <a href="https://twitter.com/drash_land">
    <img src="https://img.shields.io/twitter/url?label=%40drash_land&style=social&url=https%3A%2F%2Ftwitter.com%2Fdrash_land">
  </a>
</p>

---

## Getting Started

Make sure you have [Deno](https://deno.land/) installed before getting started.

To get you started as quickly as possible with a simple client and server, check out the following example app:

* [Browser Console](./example_apps/browser_console)

We also have a more advanced example:

* [Chat](./example_apps/chat)

All example apps in the `example_apps` directory have their own `README.md` file. The `README.md` files have all the instructions you need to get started.

## Integrating

Sockets is composed of two parts:

* A `SocketServer` class that is used to instantiate a socket server on the back-end

    ```typescript
    import { SocketServer } from "https://deno.land/x/sockets@master/mod.ts";
    
    // Create the server
    const socketServer = new SocketServer();
    socketServer.run({
      hostname: "localhost",
      port: 3000
    });
    console.log(`Socket server started on ws://${socketServer.hostname}:${socketServer.port}`);

    // Create Channel 1 and listen to messages sent to Channel 1 by clients
    socketServer.createChannel("Channel 1")
      .onMessage((packet: any) => {
        console.log(packet);
      });
    ```

* A client library that loads on the front-end

    ```html
    <script src="https://cdn.jsdelivr.net/gh/drashland/sockets@master/client.js"></script>
    <script>
      // Create the client
      const socketClient = new SocketClient({
        hostname: "localhost",
        port: 3000
      });

      // Listen to messages sent to Channel 1 by the server
      socketClient.on("Channel 1", (packet) => {
        console.log(packet);
      });

      // Send a message to Channel 1
      socketClient.send("Channel 1", "Deno + Sockets is cool!");
    </script>
    ```

## Features
    
- Binary-support

## Roadmap

- [ ] Auto-reconnection support
