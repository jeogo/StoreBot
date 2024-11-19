import { Context, SessionFlavor } from "grammy";

interface SessionData {
  awaitingPreOrderMessage?: boolean;
  preOrderProductId?: string | null;
  awaitingFullName?: boolean;
  awaitingPhoneNumber?: boolean;
}

export type MyContext = Context & SessionFlavor<SessionData>;
