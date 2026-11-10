"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Language = "en" | "ar";
type Theme = "light" | "dark" | "system";

const copy = {
  en: {
    nav: { home: "Home", about: "About", events: "Events", team: "Team", join: "Join", joinUs: "Join us", menu: "Open navigation", theme: "Toggle color theme", language: "العربية" },
    home: {
      badge: "Applications open for the new season",
      title: "Where ambitious minds build together.",
      lead: "MT Club is a community of curious people who learn, create and grow side by side through OC, projects and events.",
      become: "Become a member", eventsButton: "See events",
      whatEyebrow: "WHAT WE DO", whatTitle: "Everything a club should be.",
      ctaTitle: "Ready to be part of it?", ctaText: "Membership is free and open to everyone who loves learning.", ctaButton: "Join MT Club",
    },
    about: {
      eyebrow: "A LITTLE ABOUT US", title: "A club built on curiosity.",
      lead: "MT Club brings curious people together to learn by doing, share what they know and make meaningful things as a community.",
    },
    events: { eyebrow: "MAKE SOMETHING HAPPEN", title: "Upcoming & recent", empty: "New events are on the way.", emptyHint: "Check back soon for OC, projects and club gatherings." },
    team: { eyebrow: "MEET THE COMMUNITY", title: "The people behind the club", lead: "A small team with big curiosity, bringing people together to make the club happen." },
    join: {
      eyebrow: "YOUR NEXT CHAPTER", title: "Become a member", lead: "Tell us a little about yourself and what you'd love to explore. We'd be happy to meet you.",
      name: "Full name", email: "Email address", interest: "What are you interested in?", select: "Choose a committee",
      message: "A message for us", messageHint: "What would you like to learn or make with the club?",
      submit: "Send your application", submitting: "Sending…", successTitle: "Thanks for reaching out!", successText: "Your application has been sent. We look forward to meeting you.",
      error: "We couldn't send your application right now. Please try again later.", required: "Please complete all required fields.", invalidEmail: "Enter a valid email address.",
    },
    footer: "© 2026 MT Club. All rights reserved.",
  },
  ar: {
    nav: { home: "الرئيسية", about: "من نحن", events: "الفعاليات", team: "الفريق", join: "انضم", joinUs: "انضم إلينا", menu: "فتح القائمة", theme: "تغيير المظهر", language: "English" },
    home: {
      badge: "باب التقديم مفتوح للموسم الجديد",
      title: "حيث تصنع العقول الطموحة معًا.",
      lead: "نادي MT مجتمع يجمع الفضوليين ليتعلّموا ويبتكروا وينموا معًا من خلال ورش العمل والمشاريع والفعاليات.",
      become: "كن عضوًا", eventsButton: "استكشف الفعاليات",
      whatEyebrow: "ماذا نقدّم", whatTitle: "كل ما تتوقعه من نادٍ مميز.",
      ctaTitle: "هل أنت مستعد لتكون جزءًا منه؟", ctaText: "العضوية مجانية ومفتوحة لكل من يحب التعلّم.", ctaButton: "انضم إلى نادي MT",
    },
    about: {
      eyebrow: "نبذة عنّا", title: "نادي تصنعه روح الفضول.",
      lead: "يجمع نادي MT الأشخاص الفضوليين ليتعلّموا بالتجربة، ويتبادلوا المعرفة، وينجزوا أشياء ذات قيمة كمجتمع واحد.",
    },
    events: { eyebrow: "لنصنع شيئًا معًا", title: "الفعاليات القادمة والحديثة", empty: "فعاليات جديدة قادمة قريبًا.", emptyHint: "تابعنا للاطلاع على ورش العمل والمشاريع ولقاءات النادي." },
    team: { eyebrow: "تعرّف على مجتمعنا", title: "الأشخاص وراء النادي", lead: "فريق صغير بطموح كبير يجمع الناس ويعمل على ازدهار النادي." },
    join: {
      eyebrow: "خطوتك القادمة", title: "كن عضوًا", lead: "عرّفنا بنفسك وبما تود استكشافه، يسعدنا أن نتعرّف عليك.",
      name: "الاسم الكامل", email: "البريد الإلكتروني", interest: "ما اللجان التي تهمك؟", select: "اختر لجنة",
      message: "رسالة لنا", messageHint: "ماذا تود أن تتعلّم أو تنجز مع النادي؟",
      submit: "أرسل طلب الانضمام", submitting: "جارٍ الإرسال…", successTitle: "شكرًا لتواصلك!", successText: "تم إرسال طلبك. نتطلع إلى لقائك.",
      error: "تعذّر إرسال طلبك الآن. يرجى المحاولة لاحقًا.", required: "يرجى إكمال الحقول المطلوبة.", invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا.",
    },
    footer: "© 2026 نادي MT. جميع الحقوق محفوظة.",
  },
} as const;

type WidenStrings<T> = T extends string ? string : { [Key in keyof T]: WidenStrings<T[Key]> };
type Copy = WidenStrings<(typeof copy)["en"]>;
type SiteContextValue = {
  language: Language;
  theme: Theme;
  toggleLanguage: () => void;
  toggleTheme: () => void;
  text: Copy;
};

const SiteContext = createContext<SiteContextValue | null>(null);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("mt-language");
    const savedTheme = window.localStorage.getItem("mt-theme");
    if (savedLanguage === "ar" || savedLanguage === "en") setLanguage(savedLanguage);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("mt-language", language);
    if (theme === "system") window.localStorage.removeItem("mt-theme");
    else window.localStorage.setItem("mt-theme", theme);
  }, [language, theme]);

  const value = useMemo<SiteContextValue>(() => ({
    language,
    theme,
    toggleLanguage: () => setLanguage((current) => current === "en" ? "ar" : "en"),
    toggleTheme: () => setTheme((current) => {
      if (current === "system") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "light" : "dark";
      }
      return current === "light" ? "dark" : "light";
    }),
    text: copy[language],
  }), [language, theme]);

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}

export function useSite() {
  const value = useContext(SiteContext);
  if (!value) throw new Error("useSite must be used within SiteProvider");
  return value;
}
