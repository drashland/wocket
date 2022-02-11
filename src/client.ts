/**
 * This class represents a single end-user client. It contains information about
 * their connection ID (when they first connected to the server), their web
 * socket connection, and more.
 */
export class Client {
  /**
   * This client's ID, which is the ID of its socket connection when it
   * connected to the server. For example:
   *
   *     const clientId = conn.rid;
   */
  public id: number;

  /**
   * Not used internally, added to allow users to assign
   * uuids to clients if they wanted to, mainly to remove any
   * possible type errors
   *
   * @example
   * ```js
   * server.on('connect', e => {
   *   const client = server.clients.get(e.detail.id)
   *   client.uuid = crypto.randomUUID(); // anytime uuid is used, there will be no type errors
   * })
   * ```
   */
  public uuid = "";

  /**
   * This client's WebSocket instance.
   */
  public socket: WebSocket;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param id - The client's connection ID (given by the server when the client
   * connects to the server).
   * @param socket - The socket connection (given by the server when the client
   * connects to the server). Use this to send events back to the client. For
   * example:
   *
   *     this.socket.send("something");
   */
  constructor(id: number, socket: WebSocket) {
    this.id = id;
    this.socket = socket;
  }

  public send(
    message: string | ArrayBufferLike | Blob | ArrayBufferView,
  ): void {
    this.socket.send(message);
  }
}
