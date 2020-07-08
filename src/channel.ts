export default class Channel {
  public callbacks: any[] = [];
  public name: string;
  public listeners: any;

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
