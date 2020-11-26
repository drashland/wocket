# Chat

This is an interactive application where you send messages through a web application. The socket server receives the messages and broadcasts the messages to all socket clients. You can open multiple browser windows to act as multiple socket clients.  The web application is served using [Drash](https://github.com/drashland/deno-drash).

1. Clone the repo and go into the `/example_apps/chat` directory.

    ```
    $ git clone https://github.com/drashland/wocket.git
    $ cd wocket/example_apps/chat
    ```

2. Start the server.

    ```
    $ deno run --allow-net --allow-read app.ts
    ```

3. Go to `localhost:3001` in your browser. Remember, open additional browser windows to act as multiple clients.

4. Start sending messages between clients.

Your experience should be something similar to the following:

![Screenshot](./screenshot.png)
