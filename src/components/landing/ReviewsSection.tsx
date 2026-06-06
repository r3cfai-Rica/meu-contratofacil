import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Star, MessageSquareQuote, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  listApprovedReviews,
  submitReview,
  type PublicReview,
} from "@/lib/reviews.functions";

function StarRow({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const interactive = !!onChange;
        return (
          <button
            key={n}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(n)}
            className={interactive ? "transition hover:scale-110" : "cursor-default"}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
          >
            <Star
              className={
                "h-5 w-5 " +
                (filled ? "fill-primary text-primary" : "text-muted-foreground/40")
              }
            />
          </button>
        );
      })}
    </div>
  );
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function ReviewsSection() {
  const { user } = useAuth();
  const list = useServerFn(listApprovedReviews);
  const submit = useServerFn(submitReview);

  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    list()
      .then((data) => {
        if (mounted) setReviews(data);
      })
      .catch(() => {
        if (mounted) setReviews([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [list]);

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Faça login para enviar seu review.");
      return;
    }
    if (name.trim().length < 2) {
      toast.error("Informe seu nome.");
      return;
    }
    if (comment.trim().length < 5) {
      toast.error("Escreva um comentário um pouco maior.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: { author_name: name.trim(), rating, comment: comment.trim() },
      });
      toast.success("Obrigado! Seu review foi enviado e será publicado após aprovação.");
      setName("");
      setComment("");
      setRating(5);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar review.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs text-muted-foreground">
          <MessageSquareQuote className="h-3.5 w-3.5 text-primary" />
          Reviews
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          O que as pessoas estão dizendo
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Conte como o ContratoFácil está ajudando no seu dia a dia. Seu depoimento
          aparece aqui após aprovação.
        </p>
        {reviews.length > 0 && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <StarRow value={Math.round(avg)} />
            <span className="font-medium text-foreground">{avg.toFixed(1)}</span>
            <span>· {reviews.length} review{reviews.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {/* Reviews list */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-border/70 bg-card p-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando reviews...
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
              <MessageSquareQuote className="mx-auto h-8 w-8 text-muted-foreground/60" />
              <p className="mt-3 text-sm text-muted-foreground">
                Seja a primeira pessoa a deixar um review.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.map((r) => (
                <article
                  key={r.id}
                  className="flex flex-col rounded-2xl border border-border/70 bg-card p-5 transition hover:border-primary/40"
                >
                  <StarRow value={r.rating} />
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-foreground/90">
                    "{r.comment}"
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                    <span className="font-medium text-foreground">{r.author_name}</span>
                    <span className="text-muted-foreground">{formatDate(r.created_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Submit form */}
        <aside className="rounded-2xl border border-border/70 bg-card p-6 shadow-[var(--shadow-glow)]">
          <h3 className="text-lg font-semibold">Deixe seu review</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Reviews passam por uma rápida moderação antes de aparecer.
          </p>

          {!user ? (
            <div className="mt-5 rounded-xl border border-dashed border-border/70 bg-background/40 p-4 text-sm">
              <p className="text-muted-foreground">
                Faça login para enviar seu depoimento.
              </p>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm">
                  <Link to="/login">Entrar</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to="/signup">Criar conta</Link>
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rv-name">Seu nome</Label>
                <Input
                  id="rv-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Como devemos exibir"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Nota</Label>
                <StarRow value={rating} onChange={setRating} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rv-comment">Comentário</Label>
                <Textarea
                  id="rv-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Conte o que você achou..."
                  required
                />
                <p className="text-right text-[10px] text-muted-foreground">
                  {comment.length}/1000
                </p>
              </div>

              <Button type="submit" disabled={submitting} className="w-full gap-2">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" /> Enviar review
                  </>
                )}
              </Button>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}
