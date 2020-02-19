# Drash Sockets

## Example Apps

* [Console Chat App](https://github.com/drashland/sockets/tree/master/example_app/console_app)
* [Mini Chat Web App](https://github.com/drashland/sockets/tree/master/example_app/web_app)

## Getting Started

1. [Download deno](https://deno.land/).

2. Clone the repo and go into its directory.

```
git clone https://github.com/drashland/sockets.git
cd sockets
```

3. Open up a terminal and start the socket server.

```
deno --allow-net example_app/console_app/server.ts
Socket server started at 127.0.0.1:3000
```

4. Connect to the server using a second terminal.

```
deno --allow-net example_app/console_app/client.ts
Connected to socket server.
```

4. Send a message by typing something in the client's terminal once you are connected. Example output below:

```
client terminal
--------------------
test
```
```
server terminal
--------------------
Socket rid #4 connected.
Socket rid #4: test
```

5. Connect to the server using a third terminal. This step will show you how the socket server handles multiple clients.

```
deno --allow-all example_app/console_app/client.ts
Connected to socket server.
```

6. Send a message from both clients. Example output below:

```
client 1 terminal
--------------------
Hello
Incoming message: Hi
```
```
client 2 terminal
--------------------
Incoming message: Hello
Hi
```
```
server terminal
--------------------
Socket rid #4 connected.
Socket rid #4: test
Socket rid #5 connected.
Socket rid #4: Hello
Socket rid #5: Hi

```
