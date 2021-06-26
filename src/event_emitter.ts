import { Client } from "./client.ts";
import { Server } from "./server.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

/**
 * The EventEmitter class is responsible for listening to and dispatching
 * events.
 */
export abstract class EventEmitter extends EventTarget {
  /**
   * The name of this channel.
   */
  public name: string;

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - CONSTRUCTOR /////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Construct an object of this class.
   *
   * @param name - The name of this event emitter. This name is used in the
   * `this.addEventListener()` call. When packets want to send an event to this
   * EventEmitter, they dispatch an event using this name so that the event gets
   * routed properly to this EventEmitter.
   */
  constructor(name: string) {
    super();
    this.name = name;

    // All EventEmitter objects can dispatch events. When it dispatches events,
    // we want to make sure they are handled properly, so we set up this event
    // listener.
    this.addEventListener(this.name, this.eventHandler);
  }

  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PUBLIC ////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Broadcasts an event to all who are connected to this EventEmitter.
   */
  public broadcast(event: Event): void {
    this.dispatchEvent(event);
  }

  /**
   * Handle a packet passed to this client. Ultimately, this packet is wrapped
   * an in a CustomEvent object and dispatched (via `this.dispatchEvent()`) to
   * `this.eventHandler()`.
   *
   * @param sender - See Client.
   * @param packet - The packet to send in the CustomEvent object. Clients can
   * send complex packets of any type. We do not know what they will pass in;
   * therefore, the packet is an `unknown` type.
   *
   * @returns The packet if the event was dispatched to this class' event
   * listener, false if not.
   */
  public handlePacket(sender: Client, packet: unknown): boolean|unknown {
    // Make sure we send the sender's ID in the packet
    const hydratedPacket = packet as { sender: number };
    hydratedPacket.sender = sender.id;

    const event = new CustomEvent(this.name, {
      detail: hydratedPacket,
    });

    const result = this.dispatchEvent(event);

    if (result) {
      return packet;
    }

    return false;
  }


  //////////////////////////////////////////////////////////////////////////////
  // FILE MARKER - METHODS - PROTECTED /////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * The event handler to pass to `this.addEventListener()`.
   *
   * @param event - The event passed into the this.dispatchEvent() call. All
   * extended classes should be calling this.dispatchEvent() and passing in an
   * Event object into that call.
   */
  protected abstract eventHandler(event: Event): void;
}
