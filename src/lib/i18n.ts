import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ptBR from "@/locales/pt-BR.json";
import enUS from "@/locales/en-US.json";

export const STORAGE_KEY = "contratofacil.lang";
export const DEFAULT_LANGUAGE = "pt-BR";

function normalizeLanguage(language?: string | null) {
  return language?.toLowerCase().startsWith("en") ? "en-US" : "pt-BR";
}

function getBrowserLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) return normalizeLanguage(saved);

  return normalizeLanguage(window.navigator.language);
}

void i18n.use(initReactI18next).init({
  resources: {
    "pt-BR": { translation: ptBR },
    "en-US": { translation: enUS },
  },
  ns: ["translation"],
  defaultNS: "translation",
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: ["pt-BR", "en-US"],
  nonExplicitSupportedLngs: true,
  load: "currentOnly",
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

if (typeof window !== "undefined") {
  i18n.on("languageChanged", (language) => {
    const normalized = normalizeLanguage(language);
    window.localStorage.setItem(STORAGE_KEY, normalized);
    document.documentElement.lang = normalized;
  });
}

export { normalizeLanguage, getBrowserLanguage };
export default i18n;
