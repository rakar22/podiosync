import { prisma } from "./db";
import { audit } from "./audit";

async function refreshPremium(companyId: string | null) {
  if (!companyId) return;
  const active = await prisma.sponsoredPosition.count({
    where: {
      companyId,
      status: "ACTIVE",
      position: "PREMIUM",
      endDate: { gt: new Date() },
    },
  });
  await prisma.company.update({ where: { id: companyId }, data: { premium: active > 0 } });
}

async function enqueueWaitlist(slot: {
  id: string;
  position: string;
  categoryId: string;
  countryId: string;
  cityId: string | null;
  category: { nameEs: string; nameEn: string };
  country: { nameEs: string };
  city: { name: string } | null;
}) {
  const alerts = await prisma.waitlistAlert.findMany({
    where: {
      notified: false,
      categoryId: slot.categoryId,
      countryId: slot.countryId,
      cityId: slot.cityId,
      position: slot.position,
    },
  });
  const place = slot.city?.name || slot.country.nameEs;
  for (const alert of alerts) {
    const dedupeKey = `waitlist:${alert.id}:${slot.id}`;
    const existing = await prisma.notificationOutbox.findUnique({ where: { dedupeKey } });
    if (existing) continue;
    const subject = `TECHPODIO · posición libre · ${slot.category.nameEs} · ${place}`;
    const body = `La posición ${slot.position} en ${slot.category.nameEs} (${place}) ha quedado libre. Entra en TECHPODIO para comprarla a precio fijo si sigue disponible.`;
    await prisma.notificationOutbox.create({
      data: { toEmail: alert.email, subject, body, kind: "waitlist", dedupeKey },
    });
    await prisma.waitlistAlert.update({ where: { id: alert.id }, data: { notified: true } });
  }
}

export async function dispatchOutbox() {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !from) return { sent: 0, pending: await prisma.notificationOutbox.count({ where: { sentAt: null } }) };
  const pending = await prisma.notificationOutbox.findMany({ where: { sentAt: null }, take: 20 });
  let sent = 0;
  for (const item of pending) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: item.toEmail, subject: item.subject, text: item.body }),
    });
    if (response.ok) {
      await prisma.notificationOutbox.update({ where: { id: item.id }, data: { sentAt: new Date() } });
      sent += 1;
    }
  }
  return { sent, pending: pending.length - sent };
}

export async function runMaintenance() {
  const now = new Date();
  const stale = await prisma.sponsoredPosition.findMany({
    where: { status: "PENDING_PAYMENT", holdUntil: { lt: now } },
  });
  for (const slot of stale) {
    await prisma.sponsoredPosition.update({ where: { id: slot.id }, data: { status: "CANCELLED" } });
    if (slot.campaignId) {
      await prisma.campaign.updateMany({
        where: { id: slot.campaignId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED" },
      });
    }
    if (slot.paymentId) {
      await prisma.payment.updateMany({
        where: { id: slot.paymentId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
  }

  const due = await prisma.sponsoredPosition.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    include: { category: true, country: true, city: true },
  });
  for (const slot of due) {
    await prisma.sponsoredPosition.update({ where: { id: slot.id }, data: { status: "EXPIRED" } });
    if (slot.campaignId) {
      await prisma.campaign.update({ where: { id: slot.campaignId }, data: { status: "EXPIRED" } });
    }
    await refreshPremium(slot.companyId);
    await enqueueWaitlist(slot);
    await audit("slot.expired", "SponsoredPosition", slot.id, null, { position: slot.position });
  }

  const mail = await dispatchOutbox();
  return { releasedHolds: stale.length, expired: due.length, mail };
}

export async function refreshCompanyPremium(companyId: string | null) {
  await refreshPremium(companyId);
}
