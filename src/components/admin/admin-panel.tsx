"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApplicationsKanban,
  type ApplicationListItem,
} from "@/components/admin/applications-kanban";
import { BlogManagement, type BlogArticleItem } from "@/components/admin/blog-management";
import {
  MemberManagement,
  type AdminMemberItem,
} from "@/components/admin/member-management";
import { StaffManagement, type StaffAccount } from "@/components/admin/staff-management";
import { ADMIN_KANBAN_COLUMNS } from "@/lib/admin-kanban";
import { PAYMENT_TYPE_LABELS } from "@/lib/payment-shared";
import { formatDate } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface Stats {
  totalMembers: number;
  activeMembers: number;
  expiredMembers: number;
  suspendedMembers: number;
}

interface ApplicationStats {
  total: number;
  awaiting: number;
  approved: number;
  rejected: number;
  complement: number;
}

interface StaffPermissions {
  secretariat: boolean;
  editorial: boolean;
  staffManagement: boolean;
}

interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  roleLabel: string;
}

type AdminTab = "applications" | "members" | "payments" | "blog" | "staff";

interface AdminPaymentItem {
  id: string;
  type: string;
  amount: number;
  paidAt?: string | null;
  user: { person?: { fullName?: string; email?: string } | null; email: string };
  member?: { registrationNumber: string } | null;
  application?: { candidate?: { fullName?: string } | null } | null;
  createdAt: string;
}

function paymentPersonName(payment: AdminPaymentItem) {
  return (
    payment.user.person?.fullName ??
    payment.application?.candidate?.fullName ??
    payment.user.email
  );
}

function paymentSuccessMessage(payment: AdminPaymentItem) {
  const name = paymentPersonName(payment);
  if (payment.type === "application_fee") {
    return `Pagamento de ${name} confirmado com sucesso. A candidatura foi movida para Aprovado.`;
  }
  if (payment.type === "annual_fee") {
    return `Pagamento de ${name} confirmado com sucesso. A associação foi renovada.`;
  }
  return `Pagamento de ${name} confirmado com sucesso.`;
}

const fetchOpts = {
  credentials: "include" as RequestCredentials,
  cache: "no-store" as RequestCache,
};

export function AdminPanel() {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [staffUser, setStaffUser] = useState<StaffUser | null>(null);
  const [permissions, setPermissions] = useState<StaffPermissions | null>(null);
  const [tab, setTab] = useState<AdminTab>("applications");
  const [members, setMembers] = useState<AdminMemberItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null);
  const [articles, setArticles] = useState<BlogArticleItem[]>([]);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [pendingPayments, setPendingPayments] = useState<AdminPaymentItem[]>([]);
  const [recentPaidPayments, setRecentPaidPayments] = useState<AdminPaymentItem[]>([]);
  const [paymentFeedback, setPaymentFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const prevPendingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    bootstrap();
  }, []);

  function applyPaymentsData(
    pending: AdminPaymentItem[],
    recentPaid: AdminPaymentItem[],
    options?: { detectAutoConfirm?: boolean }
  ) {
    if (options?.detectAutoConfirm && prevPendingIdsRef.current.size > 0) {
      const pendingIds = new Set(pending.map((payment) => payment.id));
      const removedIds = [...prevPendingIdsRef.current].filter((id) => !pendingIds.has(id));

      if (removedIds.length > 0) {
        const confirmed = recentPaid.find((payment) => removedIds.includes(payment.id));
        if (confirmed) {
          setPaymentFeedback({
            type: "success",
            text: paymentSuccessMessage(confirmed),
          });
        }
      }
    }

    prevPendingIdsRef.current = new Set(pending.map((payment) => payment.id));
    setPendingPayments(pending);
    setRecentPaidPayments(recentPaid);
  }

  async function refreshPaymentsAndApplications(options?: { detectAutoConfirm?: boolean }) {
    if (!permissions?.secretariat) return;

    const [paymentsRes, appsRes] = await Promise.all([
      fetch("/api/admin/payments", fetchOpts),
      fetch("/api/admin/applications", fetchOpts),
    ]);

    if (paymentsRes.ok) {
      const data = await paymentsRes.json();
      applyPaymentsData(data.payments ?? [], data.recentPaid ?? [], {
        detectAutoConfirm: options?.detectAutoConfirm,
      });
    }

    if (appsRes.ok) {
      const data = await appsRes.json();
      setApplications(data.applications);
      setAppStats(data.stats);
    }
  }

  useEffect(() => {
    if (tab !== "payments" || !permissions?.secretariat) return;

    const interval = window.setInterval(() => {
      void refreshPaymentsAndApplications({ detectAutoConfirm: true });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [tab, permissions]);

  async function bootstrap() {
    setLoading(true);
    const meRes = await fetch("/api/admin/me", fetchOpts);
    if (!meRes.ok) {
      setAuthenticated(false);
      setLoading(false);
      return;
    }

    const me = await meRes.json();
    setAuthenticated(true);
    setStaffUser(me.user);
    setPermissions(me.permissions);
    setDefaultTab(me.permissions);
    await loadAll(me.permissions, { silent: false });
  }

  function setDefaultTab(perms: StaffPermissions) {
    if (perms.secretariat) setTab("applications");
    else if (perms.editorial) setTab("blog");
    else if (perms.staffManagement) setTab("staff");
  }

  async function loadAll(perms: StaffPermissions, options?: { silent?: boolean }) {
    if (options?.silent) setRefreshing(true);
    else setLoading(true);

    const requests: Promise<void>[] = [];

    if (perms.secretariat) {
      requests.push(
        fetch("/api/admin/members", fetchOpts).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          setMembers(data.members);
          setStats(data.stats);
        }),
        fetch("/api/admin/applications", fetchOpts).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          setApplications(data.applications);
          setAppStats(data.stats);
        }),
        fetch("/api/admin/payments", fetchOpts).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          applyPaymentsData(data.payments ?? [], data.recentPaid ?? []);
        })
      );
    }

    if (perms.editorial) {
      requests.push(
        fetch("/api/admin/articles", fetchOpts).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          setArticles(data.articles ?? []);
        })
      );
    }

    if (perms.staffManagement) {
      requests.push(
        fetch("/api/admin/staff", fetchOpts).then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          setStaffAccounts(data.staff ?? []);
        })
      );
    }

    await Promise.all(requests);
    if (options?.silent) setRefreshing(false);
    else setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "E-mail ou senha inválidos.");
      return;
    }
    await bootstrap();
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
    setAuthenticated(false);
    setStaffUser(null);
    setPermissions(null);
    setEmail("");
    setPassword("");
  }

  async function handleConfirmPayment(paymentId: string) {
    const payment = pendingPayments.find((item) => item.id === paymentId);
    setPaymentFeedback(null);
    setActionLoading(true);
    const res = await fetch("/api/admin/payments", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);

    if (res.ok) {
      if (payment) {
        setPaymentFeedback({
          type: "success",
          text: paymentSuccessMessage(payment),
        });
      }
      if (permissions) {
        await refreshPaymentsAndApplications();
      }
      return;
    }

    setPaymentFeedback({
      type: "error",
      text: data.error ?? "Erro ao confirmar pagamento.",
    });
  }

  async function handleAction(applicationId: string, action: string, extra?: Record<string, string>) {
    setActionLoading(true);
    const res = await fetch("/api/admin/applications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action, ...extra }),
    });
    setActionLoading(false);
    if (res.ok && permissions) loadAll(permissions);
  }

  async function handleStatusChange(applicationId: string, status: string) {
    setStatusError("");
    setActionLoading(true);
    const res = await fetch("/api/admin/applications", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId, action: "update_status", status }),
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(false);
    if (res.ok) {
      const updatedStatus = data.application?.status ?? status;
      const column = ADMIN_KANBAN_COLUMNS.find((c) => c.status === status);
      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? {
                ...app,
                status: updatedStatus,
                statusLabel: column?.label ?? app.statusLabel,
              }
            : app
        )
      );
      if (permissions) await loadAll(permissions, { silent: true });
    } else {
      setStatusError(data.error ?? "Não foi possível atualizar a etapa.");
    }
  }

  function refreshData() {
    if (permissions) loadAll(permissions);
  }

  if (!authenticated) {
    return (
      <Card className="max-w-md border-white/10 bg-zinc-900/50">
        <CardHeader>
          <CardTitle>Acesso da equipe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-white">{staffUser?.fullName}</p>
          <Badge variant="outline">{staffUser?.roleLabel}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Sair
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {permissions?.secretariat && (
          <>
            <Button
              variant={tab === "applications" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("applications")}
            >
              Candidaturas
            </Button>
            <Button
              variant={tab === "members" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("members")}
            >
              Associados
            </Button>
            <Button
              variant={tab === "payments" ? "default" : "outline"}
              size="sm"
              onClick={() => setTab("payments")}
            >
              Pagamentos
            </Button>
          </>
        )}
        {permissions?.editorial && (
          <Button
            variant={tab === "blog" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("blog")}
          >
            Blog
          </Button>
        )}
        {permissions?.staffManagement && (
          <Button
            variant={tab === "staff" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("staff")}
          >
            Equipe
          </Button>
        )}
      </div>

      {tab === "applications" && permissions?.secretariat && appStats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Aguardando", value: appStats.awaiting },
              { label: "Complementação", value: appStats.complement },
              { label: "Aprovadas", value: appStats.approved },
              { label: "Reprovadas", value: appStats.rejected },
              { label: "Total", value: appStats.total },
            ].map((s) => (
              <Card key={s.label} className="border-white/10 bg-zinc-900/50">
                <CardContent className="p-4">
                  <p className="text-xs text-muted">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-white/10 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Kanban de candidaturas</CardTitle>
            </CardHeader>
            <CardContent>
              {statusError && <p className="mb-4 text-sm text-red-400">{statusError}</p>}
              {applications.length === 0 && !loading ? (
                <p className="text-muted">Nenhuma candidatura ainda.</p>
              ) : (
                <ApplicationsKanban
                  applications={applications}
                  loading={loading}
                  refreshing={refreshing}
                  actionLoading={actionLoading}
                  onRefresh={refreshData}
                  onAction={handleAction}
                  onStatusChange={handleStatusChange}
                  onGoToMembers={() => setTab("members")}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {tab === "members" && permissions?.secretariat && (
        <>
          {stats && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total", value: stats.totalMembers },
                { label: "Ativos", value: stats.activeMembers },
                { label: "Vencidos", value: stats.expiredMembers },
                { label: "Suspensos", value: stats.suspendedMembers },
              ].map((s) => (
                <Card key={s.label} className="border-white/10 bg-zinc-900/50">
                  <CardContent className="p-6">
                    <p className="text-sm text-muted">{s.label}</p>
                    <p className="text-3xl font-bold text-white">{s.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <MemberManagement
            members={members}
            loading={loading}
            actionLoading={actionLoading}
            onRefresh={() => permissions && loadAll(permissions, { silent: true })}
          />
        </>
      )}

      {tab === "payments" && permissions?.secretariat && (
        <div className="space-y-6">
          {paymentFeedback && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                paymentFeedback.type === "success"
                  ? "border-green-500/30 bg-green-500/10 text-green-200"
                  : "border-red-500/30 bg-red-500/10 text-red-200"
              }`}
            >
              {paymentFeedback.text}
            </div>
          )}

          <Card className="border-white/10 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Pagamentos pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <p className="text-muted">Nenhum pagamento pendente.</p>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 p-4"
                    >
                      <div>
                        <p className="font-medium text-white">{paymentPersonName(p)}</p>
                        <p className="text-sm text-muted">
                          {PAYMENT_TYPE_LABELS[p.type] ?? p.type}
                          {p.member?.registrationNumber
                            ? ` · ${p.member.registrationNumber}`
                            : ""}{" "}
                          — R$ {Number(p.amount).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        disabled={actionLoading}
                        onClick={() => handleConfirmPayment(p.id)}
                      >
                        Confirmar pagamento
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-zinc-900/50">
            <CardHeader>
              <CardTitle>Pagamentos confirmados</CardTitle>
            </CardHeader>
            <CardContent>
              {recentPaidPayments.length === 0 ? (
                <p className="text-muted">Nenhum pagamento confirmado recentemente.</p>
              ) : (
                <div className="space-y-3">
                  {recentPaidPayments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-green-500/20 bg-green-500/5 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-400" />
                        <div>
                          <p className="font-medium text-white">{paymentPersonName(p)}</p>
                          <p className="text-sm text-muted">
                            {PAYMENT_TYPE_LABELS[p.type] ?? p.type}
                            {p.member?.registrationNumber
                              ? ` · ${p.member.registrationNumber}`
                              : p.type === "application_fee"
                                ? " · Candidatura aprovada"
                                : ""}{" "}
                            — R$ {Number(p.amount).toFixed(2)}
                          </p>
                          {p.paidAt && (
                            <p className="mt-1 text-xs text-green-300/80">
                              Pago em {formatDate(p.paidAt)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="success">Pago</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "blog" && permissions?.editorial && (
        <BlogManagement
          articles={articles}
          loading={loading}
          actionLoading={actionLoading}
          onRefresh={refreshData}
        />
      )}

      {tab === "staff" && permissions?.staffManagement && (
        <StaffManagement
          staff={staffAccounts}
          loading={loading}
          actionLoading={actionLoading}
          onRefresh={refreshData}
        />
      )}
    </div>
  );
}
