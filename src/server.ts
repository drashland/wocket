import {
  acceptWebSocket,
  DenoServer,
  HTTPOptions,
  HTTPSOptions,
  serve,
  serveTLS,
  isWebSocketCloseEvent,
} from "../deps.ts";
import { Channel } from "./channel.ts";
import { Client } from "./client.ts";
import { OnChannelCallback } from "./types.ts";

/**
 * This class is responsible for creating a users socket server, maintaining the
 * connections between sockets, and handling packets to and from sockets.
 */
export class Server {
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

  /**
   * A property to hold the Deno server. This property is set in this.run()
   * like so:
   *
   *     this.deno_server = serve();
   */
  public deno_server: DenoServer | null = null;

  /**
   * A property to hold the hostname this server listens on.
   */
  public hostname = "0.0.0.0";

  /**
   * A property to hold the port this server listens on.
   */
  public port = 1557;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Close this server.
   */
  public close(): void {
    try {
      if (this.deno_server) {
        this.deno_server.close();
      }
    } catch (_error) {
      // Do. nuh. thing. The server is probably closed if this try-catch block
      // errors out.
    }
  }

  /**
   * TODO
   * 
   * @param channelName 
   * @param cb 
   */
  public to(channelName: string, message: Record<string, unknown>, idOfClientToSendTo?: number): void {
    for (const clientId of this.clients.keys()) {
      // If idOfClientIdToSendTo is defined, skip until we get to them
      if (idOfClientToSendTo && clientId !== idOfClientToSendTo) {
        continue
      }
      const client = this.clients.get(clientId)
      client!.socket.send(JSON.stringify({
        channel: channelName,
        message: message
      }))

      // If sending to a specific client, we may as well break out of this loop as we've sent the message now
      if (idOfClientToSendTo) {
        break
      }
    }
  }

  /**
   *  TODO
   * @param channelName TODO
   * @param message 
   * @param id - Id of client not to send to eg the initiator
   */
  public broadcast(channelName: string, message: Record<string, unknown>, id: number) {
    for (const clientId of this.clients.keys()) {
      if (id === clientId) { // dont send to that client
        continue
      }
      const client = this.clients.get(clientId)
      client!.socket.send(JSON.stringify({
        channel: channelName,
        message: message
      }))
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
   * Run this server using the WS protocol.
   *
   * @param options - See HTTPOptions.
   */
  public async runWs(options: HTTPOptions): Promise<void> {
    this.handleServerOptions(options);

    this.deno_server = serve(options);

    for await (const request of this.deno_server!) {
      // listen for connections
      const { conn, headers, r: bufReader, w: bufWriter } = request;
      const socket = await acceptWebSocket({
        bufReader,
        bufWriter,
        conn,
        headers,
      });
      // Create the client
      this.clients.set(conn.rid, new Client(conn.rid, socket))
      // Call the connect callback if defined by the user
      const channel = this.channels.get("connect")
      const connectEvent = new CustomEvent("connect", {
        detail: {
          id: conn.rid
        }
      })
      if (channel) channel.callback(connectEvent)
      // Listen for messages from the client
      try {
        for await (const ev of socket) {
          // If client sent a msg
          if (typeof ev === "string") {
            const json = JSON.parse(ev) // TODO wrap in a try catch, if error throw then send error message to client maybe? ie malformed request
            // Get the channel they want to send the msg to
            const channel = this.channels.get(json.channel) as Channel // TODO :: Add check for if channel wasnt found, which just means a user hasn't created a listener for it
            // construct the event
            const customEvent = new CustomEvent(channel.name, {
              detail: {
                ...json.message,
                id: conn.rid
              }
            })
            // Call the user defined handler for the channel. Essentially a `server.on("channel", ...)` will be called
            const callback = channel.callback
            callback(customEvent)
          }
          if (isWebSocketCloseEvent(ev)) {
            // Remove the client
            this.clients.delete(conn.rid)
            // Call the disconnect handler if defined
            const { code, reason } = ev;
            const channel = this.channels.get("disconnect")
            const disconnectEvent = new CustomEvent("disconnect", {
              detail: {
                id: conn.rid,
                code,
                reason
              }
            })
            if (channel) channel.callback(disconnectEvent)
          }
        }
      } catch (err) {
        console.error(`failed to receive frame: ${err}`);
        if (!socket.isClosed) {
          await socket.close(1000).catch(console.error);
        }
      }
    }
  }

  /**
   * Run this server using the WSS protocol.
   *
   * @param options - See HTTPOptions.
   *
   * @returns A Promise of the DenoServer.
   */
  public runWss(options: HTTPSOptions): DenoServer {
    this.handleServerOptions(options);

    this.deno_server = serveTLS(options);

    //this.listenForConnections();

    return this.deno_server;
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @param options - See HTTPOptions or HTTPSOptions.
   */
  protected handleServerOptions(options: HTTPOptions | HTTPSOptions): void {
    if (options.hostname) {
      this.hostname = options.hostname;
    }

    if (options.port) {
      this.port = options.port;
    }
  }

}