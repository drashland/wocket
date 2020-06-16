# Chat

This is an interactive client-server application where you send messages through a web application. The server receives the messages and broadcasts the messages to all clients. You can open multiple browser windows to act as multiple clients.

1. Clone the repo and go into the `chat` directory.

    ```
    $ git clone https://github.com/drashland/sockets.git
    $ cd sockets/example_apps/chat
    ```

2. Start the server.

    ```
    $ deno run --allow-all app.ts
    ```

3. Navigate to localhost:3001 in your browser. Remember, open additoinal browser windows to act as multiple clients.

4. Start sending messages between clients.
