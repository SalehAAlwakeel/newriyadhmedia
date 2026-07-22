import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return v === "ar" ? "ar" : "en";
}
