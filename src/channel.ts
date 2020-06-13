export default class Channel {
  public callbacks: any[] = [];
  public name: string;
  public listeners: any;

  constructor(name: string) {
    this.name = name;
    this.listeners = new Map();
  }
}
