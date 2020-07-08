import { WebSocket } from "../deps.ts";

export class Client {
  public id: number;
  public socket: any;
  public listening_to: any[] = [];

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
