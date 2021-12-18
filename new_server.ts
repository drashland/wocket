import { Server as StdServer } from "https://deno.land/std@0.113.0/http/server.ts";
import { Channel } from "./src/channel.ts";
import { Client } from "./src/client.ts";
import { OnChannelCallback } from "./src/types.ts";

interface IOptions {
  hostname: string;
  port: number;
  protocol: "http" | "https";
}

type TRequestHandler = (r: Request) => Promise<Response>;

class Server {
  #options: IOptions;

  /**
   * A map of all created channels. The key is the channel name and the value is
   * the channel object.
   */
  public channels: Map<string, Channel> = new Map();

  /**
   * A map of all clients connected to this server. The key is the client's ID
   * and the value is the client object.
   */
  public clients: Map<number, Client> = new Map();

  //// CONSTRUCTOR /////////////////////////////////////////////////////////////

  /**
   * @param options
   */
  constructor(options: IOptions) {
    this.#options = options;
  }

  /**
   * Get the full address that this server is running on.
   */
  get address(): string {
    return `${this.#options.protocol}://${this.#options.hostname}:${this.#options.port}`;
  }

  //// PUBLIC //////////////////////////////////////////////////////////////////

  /**
   * Broadcast to other clients in a channel excluding the one passed in
   * 
   * @param channelName - Channel to send the message to
   * @param message - The message to send
   * @param id - Id of client it ignore (not send the message to)
   * 
   * @example
   * ```ts
   * interface SomeEvent { id: number }
   * server.on("some-event", (event: CustomEvent<SomeEvent>) => {
   *   const { id } = event.detail
   *   server.broadcast("some-channel", {
   *     message: "Shh everybody! " + id + " won't be getting this message!"
   *   }, id)
   * })
   * ```
   */
  public broadcast(channelName: string, message: Record<string, unknown>, id: number) {
    for (const clientId of this.clients.keys()) {
      if (clientId !== id) { // ignore sending to client that has the passed in id
        this.#send(clientId, channelName, message)
      }
    }
  }

  /**
   * TODO
   * 
   * @param channelName 
   * @param cb 
   */
  public to(channelName: string, message: Record<string, unknown>, onlySendTo?: number): void {
    // If sending to a specific client or wish to not send the message to a specific client
    if (onlySendTo) {
      // If wanting to send to only that client, do that
      const id = onlySendTo
      this.#send(id, channelName, message)
      return
    }
    // Otherwise send to all clients
    for (const clientId of this.clients.keys()) {
      this.#send(clientId, channelName, message)
    }
  }

  /**
   * Do the following:
   *
   *     1. Create a channel (if it does not already exist).
   *     2. Add a callback to that channel. This callback will be executed when
   *        events are sent to the channel.
   *     3. Store the callback in the list of callbacks that the channel has.
   *
   * @param name - The name of the channel.
   * @param cb - See OnChannelCallback in the `types.ts` file.
   */
  public on<T>(
    channelName: string,
    cb: OnChannelCallback<T>,
  ): void {
    const channel = new Channel(channelName, cb); // even if one exists, overwrite it (maybe?)
    this.channels.set(channelName, channel);
  }

  /**
   * Run the sever.
   */
  run(): void {
    const server = new StdServer({
      addr: `${this.#options.hostname}:${this.#options.port}`,
      handler: this.#getHandler()
    });
    const serverPromise = server.listenAndServe();
  }

  //// PRIVATE /////////////////////////////////////////////////////////////////

  /**
   * Get the request handler for the server.
   *
   * @returns The request handler.
   */
  #getHandler(): TRequestHandler {
    const onMessage = this.#onMessage;
    const clients = this.clients;
    const channels = this.channels;
    const eventHandler = this.#eventHandler;

    return async function (r: Request): Promise<Response> {
      console.log(r);

      const { socket, response } = Deno.upgradeWebSocket(r);

      // Create the client
      const client = new Client(clients.size, socket);
      clients.set(clients.size, client);
      // Call the connect callback if defined by the user
      const channel = channels.get("connect")

      const connectEvent = new CustomEvent("connect", {
        detail: {
          id: client.id
        }
      })

      // When the socket calls `.send()`, then do the following
      socket.onmessage = (message: MessageEvent) => {
        eventHandler(message, client);
      }

      // When the socket calls `.close()`, then do the following
      socket.onclose = (ev: any): any => {
        console.log(`clients size is: `, clients.size);
        // Remove the client
        clients.delete(client.id)
        console.log(`deleted client: `, client.id);
        // Call the disconnect handler if defined
        const { code, reason } = ev;
        const channel = channels.get("disconnect")
        const disconnectEvent = new CustomEvent("disconnect", {
          detail: {
            id: client.id,
            code,
            reason
          }
        });

        console.log(`clients size is now: `, clients.size);
      };


    //   if (channel) channel.callback(connectEvent)

    //   // Listen for messages from the client
    //   try {
    //     for await (const ev of socket) {
    //       // If client sent a msg
    //       if (typeof ev === "string") {
    //         const json = JSON.parse(ev) // TODO wrap in a try catch, if error throw then send error message to client maybe? ie malformed request
    //         // Get the channel they want to send the msg to
    //         const channel = this.channels.get(json.channel) as Channel // TODO :: Add check for if channel wasnt found, which just means a user hasn't created a listener for it
    //         // construct the event
    //         const customEvent = new CustomEvent(channel.name, {
    //           detail: {
    //             ...json.message,
    //             id: conn.rid
    //           }
    //         })
    //         // Call the user defined handler for the channel. Essentially a `server.on("channel", ...)` will be called
    //         const callback = channel.callback
    //         callback(customEvent)
    //       }
    //       if (isWebSocketCloseEvent(ev)) {
    //         // Remove the client
    //         this.clients.delete(conn.rid)
    //         // Call the disconnect handler if defined
    //         const { code, reason } = ev;
    //         const channel = this.channels.get("disconnect")
    //         const disconnectEvent = new CustomEvent("disconnect", {
    //           detail: {
    //             id: conn.rid,
    //             code,
    //             reason
    //           }
    //         })
    //         if (channel) channel.callback(disconnectEvent)
    //       }
    //     }
    //   } catch (err) {
    //     console.error(`failed to receive frame: ${err}`);
    //     if (!socket.isClosed) {
    //       await socket.close(1000).catch(console.error);
    //     }
    //   }
    // })
    // }

      return response;
    }
  }

  #eventHandler(
    message: MessageEvent,
    socket: Client,
  ): void {

    // If client sent a msg
    try {
      console.log(message);
      if ("data" in message && typeof message.data === "string") {
        const json = JSON.parse(message.data) // TODO wrap in a try catch, if error throw then send error message to client maybe? ie malformed request
        console.log(json);
        // Get the channel they want to send the msg to
        const channel = this.channels.get(json.channel) as Channel // TODO :: Add check for if channel wasnt found, which just means a user hasn't created a listener for it
        // construct the event
        const customEvent = new CustomEvent(channel.name, {
          detail: {
            ...json.message,
            id: socket.id
          }
        })
        // Call the user defined handler for the channel. Essentially a `server.on("channel", ...)` will be called
        const callback = channel.callback
        callback(customEvent)
      }
    } catch (error) {
      socket.send(error.message);
    }
    // if (isWebSocketCloseEvent(ev)) {
    //   // Remove the client
    //   this.clients.delete(clientId)
    //   // Call the disconnect handler if defined
    //   const { code, reason } = ev;
    //   const channel = this.channels.get("disconnect")
    //   const disconnectEvent = new CustomEvent("disconnect", {
    //     detail: {
    //       id: clientId,
    //       code,
    //       reason
    //     }
    //   })
    //   if (channel) channel.callback(disconnectEvent)
    // }
  }

  #onMessage(message: MessageEvent): void {
    console.log(message);
  }

  #send(clientId: number, channelName: string, message: Record<string, unknown>) {
    const client = this.clients.get(clientId)
    client!.socket.send(JSON.stringify({
      channel: channelName,
      message: message
    }))
  }
}

const server = new Server({
  hostname: "0.0.0.0",
  port: 1447,
  protocol: "http",
})

server.run();

server.on("test", (event: CustomEvent) => {
  console.log(event);
});

console.log(`Running at ${server.address}`);
