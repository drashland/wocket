import { Channel } from "./channel.ts";
import { Package } from "./package.ts";

interface IMessage {
  text: Uint8Array | string;
}

// TODO(sara) Add description
export class PackageQueueItem {

  public channel: Channel;
  public package: Package;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of the channel.
   */
  constructor(pkg: Package, channel: Channel) {
    this.package = pkg;
    this.channel = channel;
  }
}
