import { useTranslation } from "react-i18next";
import { PlayCircle } from "lucide-react";

/**
 * 🎥 CONFIGURAÇÃO DO VÍDEO EXPLICATIVO
 *
 * Para trocar o vídeo, edite a constante abaixo:
 *
 * • YouTube: cole o link normal (ex: "https://www.youtube.com/watch?v=XXXX")
 *            ou o link curto (ex: "https://youtu.be/XXXX")
 * • Vimeo:   cole o link (ex: "https://vimeo.com/123456789")
 * • Arquivo: cole a URL direta de um .mp4/.webm hospedado
 *            (ex: "https://meusite.com/video.mp4")
 *            ou importe de src/assets e use a URL gerada.
 *
 * Deixe como string vazia ("") para esconder a seção.
 */
const VIDEO_URL = "";

type EmbedInfo =
  | { kind: "youtube"; src: string }
  | { kind: "vimeo"; src: string }
  | { kind: "file"; src: string }
  | null;

function parseVideoUrl(url: string): EmbedInfo {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    // YouTube
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
      // /embed/ID or /shorts/ID
      const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/);
      if (m) return { kind: "youtube", src: `https://www.youtube.com/embed/${m[2]}` };
    }
    if (host === "youtu.be") {
      const id = u.pathname.replace("/", "");
      if (id) return { kind: "youtube", src: `https://www.youtube.com/embed/${id}` };
    }

    // Vimeo
    if (host === "vimeo.com") {
      const id = u.pathname.replace("/", "");
      if (id) return { kind: "vimeo", src: `https://player.vimeo.com/video/${id}` };
    }

    // Direct file
    if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(u.pathname)) {
      return { kind: "file", src: url };
    }
  } catch {
    return null;
  }
  return null;
}

export function VideoSection() {
  const { t } = useTranslation();
  const embed = parseVideoUrl(VIDEO_URL);

  return (
    <section className="mx-auto max-w-5xl px-6 pb-16">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <PlayCircle className="h-3.5 w-3.5 text-primary" />
          {t("landing.video.eyebrow")}
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          {t("landing.video.title")}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground sm:text-base">
          {t("landing.video.description")}
        </p>
      </div>

      <div
        className="relative aspect-video overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[var(--shadow-glow)]"
        style={{ backgroundImage: "var(--gradient-glow)" }}
      >
        {!embed ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
            <PlayCircle className="h-14 w-14 text-primary/70" />
            <div className="text-3xl font-bold tracking-[0.2em] text-foreground sm:text-5xl">
              {t("landing.video.comingSoon")}
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("landing.video.comingSoonHint")}
            </p>
          </div>
        ) : embed.kind === "file" ? (
          <video
            src={embed.src}
            controls
            playsInline
            className="h-full w-full"
          />
        ) : (
          <iframe
            src={embed.src}
            title={t("landing.video.title")}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
        )}
      </div>
    </section>
  );
}
