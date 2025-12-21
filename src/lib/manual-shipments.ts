import crypto from "node:crypto";
import { db } from "@/db";
import { manualShipments } from "@/db/schema";

export async function ensureManualShipmentForMatch(matchId: string) {
  await db
    .insert(manualShipments)
    .values({
      id: crypto.randomUUID(),
      matchId,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
}
