import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, FileSignature, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { acceptInvite } from "@/lib/team.functions";

export const Route = createFileRoute("/aceitar-convite/$token")({
  head: () => ({
    meta: [
      { title: "Aceitar convite — ContratoFácil" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AcceptInvitePage,
});

interface InviteRow {
  id: string;
  email: string;
  status: "pending" | "accepted" | "revoked";
  owner_id: string;
}

function AcceptInvitePage() {
  const { token } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const acceptFn = useServerFn(acceptInvite);

  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [ownerName, setOwnerName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("id, email, status, owner_id")
        .eq("invite_token", token)
        .maybeSingle();
      setInvite((data as InviteRow | null) ?? null);
      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", data.owner_id)
          .maybeSingle();
        if (profile?.full_name) setOwnerName(profile.full_name);
      }
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptFn({ data: { token } });
      toast.success("Convite aceito! Você agora tem acesso ao painel.");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao aceitar convite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!invite) {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold">Convite inválido</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O link pode ter expirado ou ser inválido.
        </p>
      </CenteredCard>
    );
  }

  if (invite.status === "revoked") {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold">Convite revogado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O administrador revogou este convite.
        </p>
      </CenteredCard>
    );
  }

  if (invite.status === "accepted") {
    return (
      <CenteredCard>
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-400" />
        <h1 className="text-lg font-semibold">Convite já aceito</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você já faz parte da equipe de {ownerName || "este prestador"}.
        </p>
        <Button asChild className="mt-5">
          <Link to="/dashboard">Ir para o painel</Link>
        </Button>
      </CenteredCard>
    );
  }

  if (!user) {
    return (
      <CenteredCard>
        <h1 className="text-lg font-semibold">Você foi convidado!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {ownerName || "Um prestador"} convidou{" "}
          <span className="font-medium text-foreground">{invite.email}</span> para
          colaborar no painel do ContratoFácil.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Faça login ou crie uma conta com este e-mail para aceitar o convite.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild variant="outline">
            <Link to="/login" search={{ next: `/aceitar-convite/${token}` }}>
              Entrar
            </Link>
          </Button>
          <Button asChild>
            <Link to="/signup" search={{ next: `/aceitar-convite/${token}` }}>
              Criar conta
            </Link>
          </Button>
        </div>
      </CenteredCard>
    );
  }

  const emailMismatch =
    user.email && invite.email.toLowerCase() !== user.email.toLowerCase();

  return (
    <CenteredCard>
      <h1 className="text-lg font-semibold">Aceitar convite de equipe</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {ownerName || "Um prestador"} convidou você para colaborar no painel.
      </p>
      <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3 text-left text-sm">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Convite para
        </div>
        <div className="mt-1 font-medium">{invite.email}</div>
      </div>
      {emailMismatch && (
        <p className="mt-3 text-xs text-destructive">
          Você está logado como <strong>{user.email}</strong>. Faça login com{" "}
          <strong>{invite.email}</strong> para aceitar.
        </p>
      )}
      <Button
        onClick={handleAccept}
        disabled={accepting || !!emailMismatch}
        className="mt-5 w-full"
      >
        {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar convite"}
      </Button>
    </CenteredCard>
  );
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-8 text-center">
        <span className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileSignature className="h-5 w-5" />
        </span>
        {children}
      </div>
    </div>
  );
}
