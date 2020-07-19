// TODO(sara) Add description
export class Package {
  public message: Uint8Array | string;
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
    this.message = messageText;
    this.sender_id = senderId;
  }
}
