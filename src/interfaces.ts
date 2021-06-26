/**
 * All incoming events should match this interface.
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
 *     determined by the action field. For example:
 *
 *         To send a message, the client must send the following:
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
 *         To connect to channels, the client must send the following:
 *
 *         {
 *           "action": "connect_to_channels",
 *           "payload": [
 *             "channel_1",
 *             "channel_2",
 *           ]
 *         }
 *
 *         To disconnect from channels, the client must send the following:
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
