import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { SiteProvider } from "@/components/site-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { AuthSessionProvider } from "@/components/auth-session-provider";
import { PwaRegistrar } from "@/components/pwa-registrar";
import { AppToastProvider } from "@/components/app-toast-provider";
import { routing } from "@/i18n/routing";

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const title = locale === "ar" ? "نادي MT — نتعلّم ونبتكر وننمو معًا" : "MT Club — Learn, create and grow together";
  const description = t("about.lead");
  return {
    title: { default: title, template: locale === "ar" ? "%s | نادي MT" : "%s | MT Club" },
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: { en: "/en", ar: "/ar" },
    },
    openGraph: {
      title,
      description,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      alternateLocale: locale === "ar" ? "en_US" : "ar_EG",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthSessionProvider>
        <SiteProvider>
          <AppToastProvider>
            <PwaRegistrar />
            <a className="skip-link" href="#main-content">{locale === "ar" ? "انتقل إلى المحتوى" : "Skip to main content"}</a>
            <Navbar />
            {children}
            <Footer />
          </AppToastProvider>
        </SiteProvider>
      </AuthSessionProvider>
    </NextIntlClientProvider>
  );
}
