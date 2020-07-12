import { WebSocket } from "../deps.ts";

// TODO(sara) Add description
export class Channel {
  public callbacks: Function[] = [];
  public name: string;
  public listeners: Map<number, WebSocket>;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of the channel.
   */
  constructor(name: string) {
    this.name = name;
    this.listeners = new Map();
  }
}
