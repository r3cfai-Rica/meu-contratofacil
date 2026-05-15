import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ptBR from "@/locales/pt-BR.json";
import enUS from "@/locales/en-US.json";

const STORAGE_KEY = "contratofacil.lang";
const isBrowser = typeof window !== "undefined";

const instance = i18n.use(initReactI18next);
if (isBrowser) instance.use(LanguageDetector);

void instance.init({
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS },
  },
  lng: isBrowser ? undefined : "pt-BR",
  fallbackLng: "pt-BR",
  supportedLngs: ["pt-BR", "en-US"],
  nonExplicitSupportedLngs: true,
  load: "currentOnly",
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
  detection: {
    order: ["localStorage", "navigator"],
    lookupLocalStorage: STORAGE_KEY,
    caches: ["localStorage"],
  },
});

if (isBrowser) {
  const current = i18n.language || "";
  if (/^en/i.test(current) && current !== "en-US") {
    void i18n.changeLanguage("en-US");
  } else if (!/^en/i.test(current) && current !== "pt-BR") {
    void i18n.changeLanguage("pt-BR");
  }
}

export default i18n;
