"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaymentCheckoutPanel } from "@/components/payments/payment-checkout-panel";
import { formatCpfInput } from "@/lib/application-shared";
import {
  getSupervisionPackageAmount,
  SUPERVISION_PACKAGE,
  SUPERVISION_PACKAGE_GUEST_AMOUNT,
  SUPERVISION_PACKAGE_MEMBER_AMOUNT,
} from "@/lib/supervision-package-shared";

type MembershipChoice = "yes" | "no" | "";

export function SupervisionPackagePurchase() {
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [membership, setMembership] = useState<MembershipChoice>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [resolvedAmount, setResolvedAmount] = useState<number | null>(null);
  const [resolvedIsMember, setResolvedIsMember] = useState<boolean | null>(null);

  const previewAmount = useMemo(() => {
    if (membership === "yes") return SUPERVISION_PACKAGE_MEMBER_AMOUNT;
    if (membership === "no") return SUPERVISION_PACKAGE_GUEST_AMOUNT;
    return null;
  }, [membership]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (membership !== "yes" && membership !== "no") {
      setError("Informe se você é associado SOBRAPSI.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/products/supervision-package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fullName,
        cpf,
        phone,
        claimsMember: membership === "yes",
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível iniciar a compra.");
      return;
    }

    setPaymentId(data.paymentId);
    setResolvedAmount(data.amount);
    setResolvedIsMember(data.isMember);
  }

  if (paid) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
        <p className="font-semibold text-white">Pagamento confirmado</p>
        <p className="mt-2">
          Sua inscrição no {SUPERVISION_PACKAGE.title} com{" "}
          {SUPERVISION_PACKAGE.supervisor} foi registrada. Em breve a SOBRAPSI
          entrará em contato pelo telefone informado para os próximos passos.
        </p>
        <p className="mt-3">
          Ou, se preferir, entre em contato com a nossa equipe:{" "}
          <a
            href="https://wa.me/5511918674611"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-white underline underline-offset-2"
          >
            +55 11 91867-4611
          </a>
        </p>
      </div>
    );
  }

  if (paymentId) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
          <p className="text-sm text-muted">Valor confirmado</p>
          <p className="mt-1 text-2xl font-bold text-white">
            R$ {(resolvedAmount ?? getSupervisionPackageAmount(!!resolvedIsMember)).toFixed(0)}
          </p>
          <p className="mt-2 text-sm text-muted">
            {resolvedIsMember
              ? "Tarifa de associado SOBRAPSI."
              : "Tarifa para não associados."}
          </p>
        </div>
        <PaymentCheckoutPanel
          paymentId={paymentId}
          onSuccess={() => setPaid(true)}
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setPaymentId(null);
            setResolvedAmount(null);
            setResolvedIsMember(null);
          }}
        >
          Voltar ao formulário
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-white/10 bg-zinc-900/50 p-6">
      <div>
        <h2 className="text-lg font-bold text-white">Inscrição e pagamento</h2>
        <p className="mt-1 text-sm text-muted">
          Associados: R$ {SUPERVISION_PACKAGE_MEMBER_AMOUNT}. Não associados: R${" "}
          {SUPERVISION_PACKAGE_GUEST_AMOUNT}.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-white">Você é associado SOBRAPSI?</legend>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="radio"
            name="membership"
            checked={membership === "yes"}
            onChange={() => setMembership("yes")}
          />
          Sim, sou associado
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="radio"
            name="membership"
            checked={membership === "no"}
            onChange={() => setMembership("no")}
          />
          Não sou associado
        </label>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="cpf">CPF</Label>
        <Input
          id="cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          value={cpf}
          onChange={(e) => setCpf(formatCpfInput(e.target.value))}
          required
        />
        <p className="text-xs text-muted">
          {membership === "yes"
            ? "Usaremos este CPF para confirmar sua associação e aplicar o valor de R$ 200."
            : "Consultaremos o cadastro para confirmar que este CPF não pertence a um associado."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {previewAmount != null && (
        <p className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-200">
          Valor a pagar: <strong className="text-white">R$ {previewAmount}</strong>
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Validando..." : "Continuar para o pagamento"}
      </Button>
    </form>
  );
}
