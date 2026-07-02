"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  applyPaymentBrickSectionSpacing,
  buildMercadoPagoBrickCustomization,
} from "@/lib/mercadopago-brick-theme";
import type { CheckoutPricingMethod } from "@/lib/payment-pricing";

interface CheckoutOption {
  method: CheckoutPricingMethod;
  label: string;
  amount: number;
  installments?: number;
  installmentAmount?: number;
  description: string;
}

interface CheckoutConfig {
  publicKey: string;
  paymentId: string;
  paymentType: string;
  payerEmail: string;
  description: string;
  options: CheckoutOption[];
  preferenceId?: string;
  maxInterestFreeInstallments?: number;
}

interface MercadoPagoCheckoutProps {
  paymentId: string;
  showRefreshButton?: boolean;
  onApproved?: () => void;
  onPending?: (payload: {
    pix?: {
      qrCode?: string | null;
      qrCodeBase64?: string | null;
      ticketUrl?: string | null;
    } | null;
  }) => void;
}

export function MercadoPagoCheckout({
  paymentId,
  showRefreshButton = true,
  onApproved,
  onPending,
}: MercadoPagoCheckoutProps) {
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<CheckoutPricingMethod | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [cardBin, setCardBin] = useState("");

  useEffect(() => {
    let active = true;

    async function loadConfig() {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/payments/${paymentId}/checkout`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!active) return;

      if (!res.ok) {
        setError(data.error ?? "Não foi possível carregar o checkout.");
        setLoading(false);
        return;
      }

      setConfig(data);
      setSelectedMethod(data.options[0]?.method ?? null);
      initMercadoPago(data.publicKey, { locale: "pt-BR" });
      setSdkReady(true);
      setLoading(false);
    }

    loadConfig();
    return () => {
      active = false;
    };
  }, [paymentId]);

  const selectedOption = useMemo(
    () => config?.options.find((option) => option.method === selectedMethod) ?? null,
    [config, selectedMethod]
  );

  const cardMaxInstallments = useMemo(() => {
    if (!config || !selectedOption || selectedMethod !== "card") return 1;
    return Math.min(
      config.maxInterestFreeInstallments ?? selectedOption.installments ?? 1,
      selectedOption.installments ?? 1
    );
  }, [config, selectedMethod, selectedOption]);

  const brickCustomization = useMemo(
    () =>
      buildMercadoPagoBrickCustomization({
        method: selectedMethod ?? "card",
        maxInstallments: cardMaxInstallments,
      }),
    [selectedMethod, cardMaxInstallments]
  );

  const brickContainerId =
    selectedMethod != null ? `paymentBrick_${paymentId}_${selectedMethod}` : undefined;

  const handleBrickReady = useCallback(() => {
    if (!brickContainerId) return;
    applyPaymentBrickSectionSpacing(brickContainerId);
  }, [brickContainerId]);

  useEffect(() => {
    if (!sdkReady || !brickContainerId) return;
    applyPaymentBrickSectionSpacing(brickContainerId);
  }, [brickContainerId, sdkReady, brickCustomization]);

  async function handleSubmit(param: { formData: Record<string, unknown> }) {
    const { formData } = param;
    if (!selectedMethod) {
      return;
    }

    setProcessing(true);
    setError("");

    const res = await fetch("/api/payments/mercadopago/process", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId,
        pricingMethod: selectedMethod,
        formData,
        cardBin: cardBin || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    setProcessing(false);

    if (!res.ok) {
      setError(data.error ?? "Não foi possível processar o pagamento.");
      return;
    }

    if (data.approved) {
      onApproved?.();
      return;
    }

    if (data.pending) {
      onPending?.({ pix: data.pix ?? null });
      return;
    }

    setError("Pagamento não aprovado. Verifique os dados e tente novamente.");
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando checkout...</p>;
  }

  if (error && !config) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (!config || !selectedOption) {
    return null;
  }

  const showMethodSelector = config.options.length > 1;

  return (
    <div className="space-y-4">
      {showMethodSelector && (
        <div className="space-y-2">
          <Label className="text-white">Forma de pagamento</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {config.options.map((option) => (
              <button
                key={option.method}
                type="button"
                onClick={() => setSelectedMethod(option.method)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selectedMethod === option.method
                    ? "border-primary bg-primary/10"
                    : "border-white/10 hover:border-primary/30"
                }`}
              >
                <p className="font-medium text-white">{option.label}</p>
                <p className="mt-1 text-sm text-muted">{option.description}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showMethodSelector && (
        <p className="text-sm text-muted">{selectedOption.description}</p>
      )}

      {sdkReady && selectedOption && selectedMethod && (
        <div className="space-y-4">
          <Label className="text-white">Meios de pagamento</Label>
          <div
            className="mercadopago-brick-shell w-full min-w-0 font-sans text-sm leading-5"
            data-mp-method={selectedMethod}
          >
            <Payment
            id={brickContainerId}
            key={`${paymentId}-${selectedMethod}`}
            initialization={{
              amount: selectedOption.amount,
              payer: { email: config.payerEmail },
              ...(selectedMethod === "card" && config.preferenceId
                ? { preferenceId: config.preferenceId }
                : {}),
            }}
            customization={brickCustomization}
            onReady={handleBrickReady}
            onBinChange={(bin) => setCardBin(bin)}
            onSubmit={async (param) => {
              await handleSubmit({ formData: param.formData as unknown as Record<string, unknown> });
            }}
          />
          </div>
        </div>
      )}

      {processing && (
        <p className="text-sm text-muted">Processando pagamento...</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {showRefreshButton && (
        <Button type="button" variant="outline" disabled={processing} onClick={() => window.location.reload()}>
          Atualizar status
        </Button>
      )}
    </div>
  );
}
