import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./i18n";

export async function readLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}

export function safeNext(value: string | null | undefined, locale: string) {
  if (!value || !value.startsWith(`/${locale}/`) || value.startsWith("//")) {
    return `/${locale}/dashboard`;
  }
  return value;
}
