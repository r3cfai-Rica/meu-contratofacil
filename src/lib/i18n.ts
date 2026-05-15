import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ptBR from "@/locales/pt-BR.json";
import enUS from "@/locales/en-US.json";

const STORAGE_KEY = "contratofacil.lang";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "pt-BR": { translation: ptBR },
      "en-US": { translation: enUS },
    },
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "en-US"],
    nonExplicitSupportedLngs: true,
    load: "currentOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Normaliza inglês de qualquer região para en-US, restante vai para pt-BR
const current = i18n.language || "";
if (/^en/i.test(current)) {
  void i18n.changeLanguage("en-US");
} else if (current !== "pt-BR" && current !== "en-US") {
  void i18n.changeLanguage("pt-BR");
}

export default i18n;
