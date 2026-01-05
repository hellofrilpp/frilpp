import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  auditLogs,
  billingSubscriptions,
  creators,
  loginTokens,
  notifications,
  users,
} from "@/db/schema";

export async function deleteUserAccount(userId: string) {
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = userRows[0] ?? null;
  if (!user) return { deleted: false };

  const creatorRows = await db
    .select({ email: creators.email, phone: creators.phone })
    .from(creators)
    .where(eq(creators.id, userId))
    .limit(1);
  const creator = creatorRows[0] ?? null;

  const notificationTargets = [user.email, creator?.email ?? null, creator?.phone ?? null].filter(
    (value): value is string => Boolean(value),
  );
  const tokenEmails = Array.from(
    new Set([user.email, creator?.email ?? null].filter((value): value is string => Boolean(value))),
  );

  await db.transaction(async (tx) => {
    if (notificationTargets.length) {
      await tx.delete(notifications).where(inArray(notifications.to, notificationTargets));
    }
    if (tokenEmails.length) {
      await tx.delete(loginTokens).where(inArray(loginTokens.email, tokenEmails));
    }

    await tx.delete(auditLogs).where(eq(auditLogs.actorId, userId));
    await tx
      .delete(billingSubscriptions)
      .where(and(eq(billingSubscriptions.subjectType, "CREATOR"), eq(billingSubscriptions.subjectId, userId)));

    await tx.delete(creators).where(eq(creators.id, userId));
    await tx.delete(users).where(eq(users.id, userId));
  });

  return { deleted: true };
}
