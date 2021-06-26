// import { Transmitter } from "./transmitter.ts";
import { Server } from "./server.ts";
import { RESERVED_EVENT_NAMES } from "./reserved_event_names.ts";

/**
 * The EventEmitter class is responsible for the logic of sending and receiving
 * messages. To do this, it aggregates information on clients, such as tracking
 * how many clients are connected and what channels are open.
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
   * Broadcasts a message to all who are connected to this EventEmitter.
   */
  public broadcast(event: Event): void {
    this.dispatchEvent(event);
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
