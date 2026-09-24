import { prisma } from "./db";

export async function audit(action: string, entity: string, entityId: string | null, userId?: string | null, meta?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      userId: userId || null,
      meta: meta ? JSON.stringify(meta).slice(0, 4000) : null,
    },
  });
}

export async function trackEvent(input: {
  name: string;
  path?: string | null;
  locale?: string | null;
  userId?: string | null;
  companyId?: string | null;
  metadata?: unknown;
}) {
  await prisma.analyticsEvent.create({
    data: {
      name: input.name.slice(0, 80),
      path: input.path?.slice(0, 300) || null,
      locale: input.locale?.slice(0, 8) || null,
      userId: input.userId || null,
      companyId: input.companyId || null,
      metadata: input.metadata ? JSON.stringify(input.metadata).slice(0, 2000) : null,
    },
  });
}
