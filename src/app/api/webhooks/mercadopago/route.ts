import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { syncMercadoPagoProviderPayment } from "@/lib/payments";

function getWebhookSecret(): string | null {
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  if (!secret) return null;
  return secret;
}

/**
 * Valida a assinatura HMAC do Mercado Pago.
 *
 * Header `x-signature`: `ts=<timestamp>,v1=<hmac-hex>`.
 * Manifest (template oficial do MP):
 *   `id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];`
 * - `data.id` vem dos query params (lowercase se alfanumérico).
 * - `x-request-id` vem do header homônimo.
 * - `ts` vem do `x-signature`.
 * - Pares cujos valores não existam devem ser omitidos do manifest.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function verifyMercadoPagoSignature(
  request: NextRequest,
  dataId: string
): boolean {
  const secret = getWebhookSecret();
  if (!secret) return false;

  const signatureHeader = request.headers.get("x-signature") ?? "";
  if (!signatureHeader) return false;

  let ts: string | null = null;
  let v1: string | null = null;
  for (const part of signatureHeader.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  const xRequestId = request.headers.get("x-request-id") ?? "";

  let manifest = "";
  if (dataId) manifest += `id:${dataId.toLowerCase()};`;
  if (xRequestId) manifest += `request-id:${xRequestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  if (expected.length !== v1.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    return false;
  }
}

const SYNC_TIMEOUT_MS = 12000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("sync_timeout")), ms)
    ),
  ]);
}

export async function POST(request: NextRequest) {
  try {
    const secret = getWebhookSecret();
    const rawBody = await request.text();
    let body: Record<string, unknown> = {};
    try {
      body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
    } catch {
      body = {};
    }

    // data.id: preferimos query param (é o que entra no manifest), depois
    // o header `x-query-params`, depois o corpo da notificação.
    const queryDataId =
      request.nextUrl.searchParams.get("data.id") ??
      request.nextUrl.searchParams.get("id") ??
      null;

    const queryParamsHeader = request.headers.get("x-query-params") ?? "";
    let headerDataId: string | null = null;
    if (queryParamsHeader) {
      const params = new URLSearchParams(queryParamsHeader);
      headerDataId = params.get("data.id") ?? params.get("id");
    }

    const bodyData = (body.data ?? {}) as { id?: string | number };
    const bodyDataId = bodyData.id != null ? String(bodyData.id) : null;

    const dataIdForManifest = (queryDataId ?? headerDataId ?? bodyDataId ?? "").toLowerCase();
    const providerPaymentId = queryDataId ?? headerDataId ?? bodyDataId ?? null;

    // Sem segredo configurado => recusa tudo (não executa sync cego).
    if (!secret) {
      console.warn(
        "[mercadopago webhook] MP_WEBHOOK_SECRET não configurado — notificação rejeitada."
      );
      return NextResponse.json({ ok: false, error: "webhook_not_configured" }, { status: 503 });
    }

    const valid = verifyMercadoPagoSignature(request, dataIdForManifest);
    if (!valid) {
      console.warn("[mercadopago webhook] assinatura inválida ou ausente.");
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }

    if (!providerPaymentId) {
      return NextResponse.json({ ok: true });
    }

    // O sync chama a API do MP; sem timeout o fetch pode pendurar e estourar o
    // limite do MP (timeout de entrega). Limitamos aqui e, em falha, devolvemos
    // 500 para o MP reentregar a notificação depois.
    try {
      await withTimeout(syncMercadoPagoProviderPayment(providerPaymentId), SYNC_TIMEOUT_MS);
      return NextResponse.json({ ok: true });
    } catch (error) {
      console.error("[mercadopago webhook] sync falhou:", error);
      return NextResponse.json({ ok: false, error: "sync_failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("[mercadopago webhook]", error);
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
