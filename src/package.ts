interface IMessage {
  text: Uint8Array | string;
}

// TODO(sara) Add description
export class Package {
  public message: IMessage;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRCUTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   */
  constructor(messageText: Uint8Array | string) {
    this.message = {
      text: messageText;
    }
  }
}
