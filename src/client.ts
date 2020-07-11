import { WebSocket } from "../deps.ts";

// TODO(sara) Add description
export class Client {
  public heartbeat_id: number | null = null;
  public id: number;
  public listening_to: string[] = [];
  public pong_received: boolean = false;
  public socket: WebSocket;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param id - The client's ID.
   * @param socket - The socket this client belongs to.
   */
  constructor(id: number, socket: WebSocket) {
    this.id = id;
    this.socket = socket;
  }
}
