import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type LoginSearch = { next?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    next: typeof search.next === "string" ? search.next : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — ContratoFácil" },
      { name: "description", content: "Acesse sua conta ContratoFácil." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { next } = Route.useSearch();
  const redirectTo = next && next.startsWith("/") ? next : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("invalid")) {
        toast.error("E-mail ou senha incorretos");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Bem-vindo de volta!");
    navigate({ to: "/dashboard" });
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Digite seu e-mail para recuperar a senha");
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Enviamos um e-mail com instruções para redefinir sua senha");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/15 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <span>
            Contrato<span className="text-primary">Fácil</span>
          </span>
        </Link>

        <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-[var(--shadow-card)]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Entre na sua conta para continuar
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {resetLoading ? "Enviando..." : "Esqueci minha senha"}
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/signup" className="text-primary hover:underline">
              Cadastrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
