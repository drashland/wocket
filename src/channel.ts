type Cb = (((event: CustomEvent) => void) | ((event: CustomEvent) => Promise<void>))

/**
 * This class represents channels, also known as "rooms" to some, and is
 * responsible for the following:
 *
 *     - Connecting clients
 *     - Disconnecting clients
 */
export class Channel {

  public name: string
  /**
   * An array of callbacks to execute when a client connects to this channel.
   */
  public callback: Cb;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of this channel.
   */
  constructor(name: string, cb: Cb) {
    this.callback = cb
    this.name = name
  }
}
