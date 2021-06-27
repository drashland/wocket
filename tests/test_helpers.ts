import { WebSocket } from "../deps.ts";

export const fakeClientSocket = () => {
  return {
    send: () => {
      return true
    },
    close: () => {
      return true
    },
  } as unknown as WebSocket;
};


