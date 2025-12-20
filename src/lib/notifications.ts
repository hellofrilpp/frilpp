import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";

export type NotificationChannel = "EMAIL" | "SMS" | "WHATSAPP";

export async function enqueueNotification(params: {
  channel: NotificationChannel;
  to: string;
  type: string;
  payload?: unknown;
}) {
  await db.insert(notifications).values({
    id: crypto.randomUUID(),
    channel: params.channel,
    status: "PENDING",
    to: params.to,
    type: params.type,
    payload: params.payload ? JSON.stringify(params.payload) : null,
    createdAt: new Date(),
  });
}

export async function markNotificationSent(id: string) {
  await db
    .update(notifications)
    .set({ status: "SENT", sentAt: new Date(), error: null })
    .where(eq(notifications.id, id));
}

export async function markNotificationError(id: string, error: string) {
  await db
    .update(notifications)
    .set({ status: "ERROR", error, sentAt: null })
    .where(eq(notifications.id, id));
}

