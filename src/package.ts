import { IMessage } from "./interfaces.ts";

// TODO(sara) Add description
export class Package {
  public message: IMessage;
  public sender_id: number | null;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of the channel.
   */
  constructor(
    messageText: Uint8Array | string,
    senderId: number | null = null,
  ) {
    this.message = {
      text: messageText,
    };
    this.sender_id = senderId;
  }
}
