"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import enMessages from "@/messages/en.json";
import arMessages from "@/messages/ar.json";

type Language = "en" | "ar";
type Theme = "light" | "dark" | "system";
type Widen<T> = T extends string ? string : T extends readonly (infer Item)[] ? Widen<Item>[] : { [Key in keyof T]: Widen<T[Key]> };
type SiteText = Widen<typeof enMessages.site>;
type SiteContextValue = {
  language: Language;
  theme: Theme;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  text: SiteText;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const activeLocale = useLocale() as Language;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("site");
  const { data: session } = useSession();
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("mt-theme");
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    if (theme === "system") window.localStorage.removeItem("mt-theme");
    else window.localStorage.setItem("mt-theme", theme);
  }, [theme]);

  const value = useMemo<SiteContextValue>(() => {
    const catalog = activeLocale === "ar" ? arMessages.site : enMessages.site;
    const text: SiteText = {
      ...catalog,
      nav: {
        ...catalog.nav,
        home: t("nav.home"),
        about: t("nav.about"),
        events: t("nav.events"),
        team: t("nav.team"),
        join: t("nav.join"),
        joinUs: t("nav.joinUs"),
        menu: t("nav.menu"),
        theme: t("nav.theme"),
      },
    };
    return {
      language: activeLocale,
      theme,
      toggleLanguage: () => {
        const nextLocale = activeLocale === "en" ? "ar" : "en";
        document.cookie = `NEXT_LOCALE=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
        document.documentElement.lang = nextLocale;
        document.documentElement.dir = nextLocale === "ar" ? "rtl" : "ltr";
        if (session?.user) {
          void fetch("/api/profile/language", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ preferredLanguage: nextLocale }),
          }).catch((error) => console.error("[Profile language] Could not update preference", error));
        }
        router.replace(pathname, { locale: nextLocale });
      },
      toggleTheme: () => setTheme((current) => {
        if (current === "system") {
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
        }
        return current === "light" ? "dark" : "light";
      }),
      text,
    };
  }, [activeLocale, pathname, router, session?.user, t, theme]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used within SiteProvider");
  return value;
}
