/**
 * All incoming events should have the following schema.
 *
 * action
 *
 *     The action that the server should take. For example:
 *
 *         {
 *           "action": "send_message",
 *           "payload": "something"
 *         }
 *
 * payload
 *
 *     The payload to send alongside the action. The payload to send is
 *     determined by the action field.
 *
 *         Sending a message:
 *
 *         {
 *           "action": "send_message",
 *           "payload": {
 *             "username": "Ed",
 *             "id": 4,
 *             "message": "Hella guuud."
 *           }
 *         }
 *
 *         Connecting to channels:
 *
 *         {
 *           "action": "connect_to_channels",
 *           "payload": [
 *             "channel_1",
 *             "channel_2",
 *           ]
 *         }
 *
 *         Disconnecting from channels:
 *
 *         {
 *           "action": "disconnect_from_channels",
 *           "payload": [
 *             "channel_1",
 *             "channel_2",
 *           ]
 *         }
 */
export interface IIncomingEvent {
  action: string;
  payload: unknown;
}
