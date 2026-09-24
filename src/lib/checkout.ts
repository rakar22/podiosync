import { prisma } from "./db";
import { audit, trackEvent } from "./audit";
import { amountMatches, getStripe, sessionIsPaid, stripeEnabled } from "./stripe";
import { HOLD_MINUTES, isPosition, resolvePrice, type PriceCandidate } from "./positions";
import { publicOrigin } from "./site";
import { slugify } from "./slug";
import { refreshCompanyPremium, runMaintenance } from "./maintenance";
import type { Locale } from "./i18n";
import { categoryName, countryName, positionLabel } from "./i18n";

function addDays(date: Date, days: number) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function loadRules(): Promise<PriceCandidate[]> {
  const rules = await prisma.pricingRule.findMany({ where: { active: true } });
  return rules.map((rule) => ({
    id: rule.id,
    position: rule.position,
    categoryId: rule.categoryId,
    countryId: rule.countryId,
    cityId: rule.cityId,
    durationDays: rule.durationDays,
    priceCents: rule.priceCents,
    currency: rule.currency,
    active: rule.active,
    example: rule.example,
  }));
}

export async function quotePrice(input: {
  position: string;
  categoryId: string;
  countryId: string;
  cityId: string | null;
  durationDays: number;
}) {
  const rules = await loadRules();
  return resolvePrice(rules, input);
}

async function uniqueSlug(base: string) {
  const root = slugify(base) || "empresa";
  let slug = root;
  let n = 2;
  while (await prisma.company.findUnique({ where: { slug } })) {
    slug = `${root}-${n}`;
    n += 1;
  }
  return slug;
}

export async function startPurchase(input: {
  userId: string;
  locale: Locale;
  categoryId: string;
  countryId: string;
  cityId: string | null;
  position: string;
  durationDays: number;
  companyId?: string | null;
  newCompanyName?: string | null;
  newCompanyWebsite?: string | null;
}) {
  if (!stripeEnabled()) {
    throw new Error("STRIPE_NOT_CONFIGURED");
  }
  if (!isPosition(input.position)) throw new Error("POSITION");
  await runMaintenance();

  const [category, country, city, user] = await Promise.all([
    prisma.category.findUnique({ where: { id: input.categoryId } }),
    prisma.country.findUnique({ where: { id: input.countryId } }),
    input.cityId ? prisma.city.findUnique({ where: { id: input.cityId } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: input.userId } }),
  ]);
  if (!category || !country || !user) throw new Error("NOT_FOUND");
  if (input.cityId && (!city || city.countryId !== country.id)) throw new Error("CITY");

  const rule = await quotePrice({
    position: input.position,
    categoryId: category.id,
    countryId: country.id,
    cityId: city?.id || null,
    durationDays: input.durationDays,
  });
  if (!rule) throw new Error("NO_PRICE");

  let companyId = input.companyId || null;
  if (companyId) {
    const member = await prisma.companyMember.findUnique({
      where: { userId_companyId: { userId: user.id, companyId } },
    });
    if (!member && user.role !== "ADMIN") throw new Error("FORBIDDEN");
  } else {
    const name = (input.newCompanyName || "").trim();
    const website = (input.newCompanyWebsite || "").trim();
    if (name.length < 2 || !/^https?:\/\//i.test(website)) throw new Error("COMPANY");
    const created = await prisma.company.create({
      data: {
        name,
        slug: await uniqueSlug(name),
        website,
        countryId: country.id,
        cityId: city?.id || null,
        claimed: true,
        verificationStatus: "PENDING",
        source: "self-serve",
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    companyId = created.id;
    if (user.role === "USER") {
      await prisma.user.update({ where: { id: user.id }, data: { role: "COMPANY" } });
    }
  }

  const now = new Date();
  const holdUntil = new Date(now.getTime() + HOLD_MINUTES * 60 * 1000);
  const scope = {
    categoryId: category.id,
    countryId: country.id,
    cityId: city?.id || null,
    position: input.position,
  };

  const prepared = await prisma.$transaction(async (tx) => {
    const blocking = await tx.sponsoredPosition.findMany({
      where: {
        ...scope,
        OR: [
          { status: "ACTIVE", endDate: { gt: now } },
          { status: "PENDING_PAYMENT", holdUntil: { gt: now } },
        ],
      },
    });
    const ownActive = blocking.find((slot) => slot.status === "ACTIVE" && slot.companyId === companyId);
    const foreign = blocking.find((slot) => slot.companyId !== companyId);
    if (foreign) {
      throw new Error("OCCUPIED");
    }
    if (!ownActive && blocking.some((slot) => slot.status === "PENDING_PAYMENT" && slot.companyId !== companyId)) {
      throw new Error("OCCUPIED");
    }
    const ownPending = blocking.find((slot) => slot.status === "PENDING_PAYMENT" && slot.companyId === companyId);
    if (ownPending) {
      await tx.sponsoredPosition.update({ where: { id: ownPending.id }, data: { status: "CANCELLED" } });
      if (ownPending.campaignId) {
        await tx.campaign.update({ where: { id: ownPending.campaignId }, data: { status: "CANCELLED" } });
      }
    }

    const campaign = await tx.campaign.create({
      data: {
        companyId: companyId!,
        userId: user.id,
        status: "PENDING_PAYMENT",
        position: input.position,
        categoryId: category.id,
        countryId: country.id,
        cityId: city?.id || null,
        durationDays: input.durationDays,
        priceCents: rule.priceCents,
        currency: rule.currency,
        renewalOfId: ownActive?.id || null,
      },
    });
    const payment = await tx.payment.create({
      data: {
        amountCents: rule.priceCents,
        currency: rule.currency,
        status: "PENDING",
        companyId,
        userId: user.id,
        campaignId: campaign.id,
        metadata: JSON.stringify({ locale: input.locale, renewal: Boolean(ownActive) }),
      },
    });
    let slotId = ownActive?.id || null;
    if (!ownActive) {
      const slot = await tx.sponsoredPosition.create({
        data: {
          ...scope,
          companyId,
          priceCents: rule.priceCents,
          currency: rule.currency,
          durationDays: input.durationDays,
          status: "PENDING_PAYMENT",
          holdUntil,
          paymentId: payment.id,
          campaignId: campaign.id,
        },
      });
      slotId = slot.id;
    }
    return { campaignId: campaign.id, paymentId: payment.id, slotId, renewal: Boolean(ownActive) };
  });

  const place = city?.name || countryName(input.locale, country);
  const stripe = getStripe();
  const origin = publicOrigin();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: input.locale === "en" ? "en" : "es",
      client_reference_id: prepared.paymentId,
      customer_email: user.email,
      success_url: `${origin}/${input.locale}/checkout/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${input.locale}/checkout/cancelado`,
      billing_address_collection: "auto",
      metadata: {
        payment_id: prepared.paymentId,
        campaign_id: prepared.campaignId,
        slot_id: prepared.slotId || "",
        company_id: companyId || "",
        position: input.position,
        amount: String(rule.priceCents),
        currency: rule.currency,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: rule.currency,
            unit_amount: rule.priceCents,
            product_data: {
              name: `TECHPODIO · ${positionLabel(input.locale, input.position)}`,
              description: `${categoryName(input.locale, category)} · ${place} · ${input.durationDays} días`.slice(0, 400),
            },
          },
        },
      ],
    });
  } catch (error) {
    await prisma.sponsoredPosition.updateMany({
      where: { paymentId: prepared.paymentId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED" },
    });
    await prisma.campaign.update({ where: { id: prepared.campaignId }, data: { status: "CANCELLED" } });
    await prisma.payment.update({ where: { id: prepared.paymentId }, data: { status: "FAILED" } });
    throw error;
  }

  await prisma.payment.update({
    where: { id: prepared.paymentId },
    data: { stripeSessionId: session.id },
  });
  await audit("checkout.started", "Payment", prepared.paymentId, user.id, { position: input.position });
  await trackEvent({
    name: "checkout_started",
    locale: input.locale,
    userId: user.id,
    companyId,
    metadata: { position: input.position, amount: rule.priceCents },
  });
  if (!session.url) throw new Error("STRIPE_URL");
  return session.url;
}

export async function fulfillCheckoutSession(sessionId: string) {
  if (!sessionId) return { ok: false as const, error: "missing_session" };
  await runMaintenance();
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (!sessionIsPaid(session)) return { ok: false as const, waiting: true as const };

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [{ stripeSessionId: session.id }, { id: session.metadata?.payment_id || "__none__" }, { id: session.client_reference_id || "__none__" }],
    },
    include: { campaign: true },
  });
  if (!payment || !payment.campaign) return { ok: false as const, missing: true as const };
  if (payment.status === "PAID" && payment.campaign.status === "ACTIVE") {
    return { ok: true as const, already: true as const, conflict: false as const };
  }
  if (!amountMatches(session, payment.amountCents, payment.currency)) {
    return { ok: false as const, error: "amount_mismatch" as const };
  }

  const now = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.payment.findUnique({ where: { id: payment.id }, include: { campaign: true } });
    if (!fresh?.campaign) return { conflict: false, already: false, missing: true };
    if (fresh.status === "PAID" && fresh.campaign.status === "ACTIVE") return { conflict: false, already: true, missing: false };

    const scope = {
      categoryId: fresh.campaign.categoryId,
      countryId: fresh.campaign.countryId,
      cityId: fresh.campaign.cityId,
      position: fresh.campaign.position,
    };
    const blocking = await tx.sponsoredPosition.findMany({
      where: {
        ...scope,
        OR: [
          { status: "ACTIVE", endDate: { gt: now } },
          { status: "PENDING_PAYMENT", holdUntil: { gt: now }, paymentId: { not: fresh.id } },
        ],
      },
    });
    const renewalId = fresh.campaign.renewalOfId;
    const own = blocking.find((slot) => slot.companyId === fresh.companyId && slot.status === "ACTIVE");
    const foreign = blocking.find((slot) => slot.companyId !== fresh.companyId);

    if (foreign && !(renewalId && own && own.id === renewalId)) {
      await tx.payment.update({
        where: { id: fresh.id },
        data: {
          status: "PAID",
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
          metadata: JSON.stringify({ conflict: true, session: session.id }),
        },
      });
      await tx.campaign.update({ where: { id: fresh.campaign.id }, data: { status: "CANCELLED" } });
      await tx.sponsoredPosition.updateMany({
        where: { paymentId: fresh.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED" },
      });
      return { conflict: true, already: false, missing: false };
    }

    const endBase = own?.endDate && own.endDate > now ? own.endDate : now;
    const endDate = addDays(endBase, fresh.campaign.durationDays);
    if (own) {
      await tx.sponsoredPosition.update({
        where: { id: own.id },
        data: {
          status: "ACTIVE",
          startDate: own.startDate || now,
          endDate,
          priceCents: fresh.amountCents,
          currency: fresh.currency,
          durationDays: fresh.campaign.durationDays,
          holdUntil: null,
          paymentId: fresh.id,
          campaignId: fresh.campaign.id,
        },
      });
    } else {
      const pending = await tx.sponsoredPosition.findFirst({ where: { paymentId: fresh.id } });
      if (pending) {
        await tx.sponsoredPosition.update({
          where: { id: pending.id },
          data: { status: "ACTIVE", startDate: now, endDate, holdUntil: null },
        });
      } else {
        await tx.sponsoredPosition.create({
          data: {
            ...scope,
            companyId: fresh.companyId,
            priceCents: fresh.amountCents,
            currency: fresh.currency,
            durationDays: fresh.campaign.durationDays,
            status: "ACTIVE",
            startDate: now,
            endDate,
            paymentId: fresh.id,
            campaignId: fresh.campaign.id,
          },
        });
      }
    }
    await tx.campaign.update({
      where: { id: fresh.campaign.id },
      data: { status: "ACTIVE", startDate: own?.startDate || now, endDate },
    });
    await tx.payment.update({
      where: { id: fresh.id },
      data: {
        status: "PAID",
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null,
      },
    });
    return { conflict: false, already: false, missing: false };
  });

  if (result.missing) return { ok: false as const, missing: true as const };
  if (!result.conflict) {
    await refreshCompanyPremium(payment.companyId);
    await audit("checkout.paid", "Payment", payment.id, payment.userId, { session: session.id });
    await trackEvent({
      name: "checkout_completed",
      userId: payment.userId,
      companyId: payment.companyId,
      metadata: { amount: payment.amountCents },
    });
  }
  return { ok: true as const, already: result.already, conflict: result.conflict };
}
