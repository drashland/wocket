export default class Client {
  public id: number;
  public socket: any;
  public listening_to: any[] = [];

  constructor(id: number, socket: any) {
    this.id = id;
    this.socket = socket;
  }
}
