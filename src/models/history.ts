// src/models/history.ts

import { ObjectId } from "mongodb";

export interface HistoryEntry {
  entity: string;
  entityId: ObjectId;
  action: string;
  timestamp: Date;
  performedBy: {
    type: string;
    id: string | null;
  };
  details: string;
  metadata: Record<string, any>;
}
