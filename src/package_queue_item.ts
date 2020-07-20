import { Channel } from "./channel.ts";
import { Package } from "./package.ts";

/**
 * The PackageQueueItem class represents a single item
 * in the queue of messages to send to the client
 */
export class PackageQueueItem {

  /**
   * The channel instance, so this class can
   * send the data down to the clients
   * connected to the channel
   */
  public channel: Channel;

  /**
   * The package instance, holding the data to sent to the channel
   */
  public package: Package;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param pkg - The package which is the data to send.
   * @param channel - The channel instance, of which we wish to use to send to
   */
  constructor(pkg: Package, channel: Channel) {
    this.package = pkg;
    this.channel = channel;
  }
}
