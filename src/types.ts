import { Packet } from "./packet.ts";

export type Callback = ((packet?: Packet) => void);
