/**
 * The Package class represents the data that is sent
 * down through the socket.
 */
export class Package {
  /**
   * The message to send to the client
   */
  public message: Uint8Array | string;

  /**
   * // TODO(edward) This seems to never be passed in any any occurance, and the only time this property is set on ann instance of Package is for: `package.sender_id = null`. Is it needed? It seems unused
   */
  public sender_id: number | null;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param messageText - The message to send down the socket.
   * @param senderId - // TODO(edward) See above message on the property
   */
  constructor(
    messageText: Uint8Array | string,
    senderId: number | null = null,
  ) {
    this.message = messageText;
    this.sender_id = senderId;
  }
}
