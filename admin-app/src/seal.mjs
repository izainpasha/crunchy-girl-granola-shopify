import { getConfig, requireValues } from "./config.mjs";

async function parseResponse(response) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Seal returned HTTP ${response.status} with a non-JSON response.`);
  }
  if (!response.ok) throw new Error(`Seal returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  if (body.success === false) throw new Error(`Seal rejected the request: ${JSON.stringify(body)}`);
  return body;
}

export async function sealRequest(method, endpoint, { query = {}, body } = {}) {
  const { seal } = getConfig();
  requireValues([["SEAL_API_TOKEN", seal.token]]);
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = new URL(`${seal.baseUrl}${normalizedEndpoint}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Seal-Token": seal.token,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse(response);
}

export function listSubscriptions(options = {}) {
  return sealRequest("GET", "/subscriptions", {
    query: {
      page: options.page || 1,
      query: options.query,
      "active-only": options.activeOnly,
      "paused-only": options.pausedOnly,
      "cancelled-only": options.cancelledOnly,
      "with-items": options.withItems,
      "with-billing-attempts": options.withBillingAttempts,
    },
  });
}

export function getSubscription(id) {
  return sealRequest("GET", "/subscription", { query: { id } });
}

export function subscriptionAction(id, action) {
  const allowed = new Set(["pause", "resume", "cancel", "reactivate", "send_payment_method_update_email"]);
  if (!allowed.has(action)) throw new Error(`Unsupported subscription action: ${action}`);
  return sealRequest("PUT", "/subscription", { body: { id: Number(id), action } });
}
