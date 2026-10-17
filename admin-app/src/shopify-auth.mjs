import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import { spawn } from "node:child_process";
import { getConfig, requireValues } from "./config.mjs";

const redirectUri = "http://127.0.0.1:3456/oauth/callback";
const timeoutMs = 5 * 60 * 1000;
const requestedScopes = [
  "read_products",
  "write_products",
  "read_publications",
  "write_publications",
  "read_purchase_options",
  "write_purchase_options",
  "read_legal_policies",
  "write_legal_policies",
];

function verifyHmac(searchParams, secret) {
  const supplied = searchParams.get("hmac") || "";
  const message = [...searchParams.entries()]
    .filter(([key]) => key !== "hmac")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  const expected = crypto.createHmac("sha256", secret).update(message).digest("hex");
  const suppliedBuffer = Buffer.from(supplied, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return suppliedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function updateEnv(envPath, values) {
  const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const remaining = new Map(Object.entries(values));
  const updated = lines.map((line) => {
    const separator = line.indexOf("=");
    if (separator < 1) return line;
    const key = line.slice(0, separator);
    if (!remaining.has(key)) return line;
    const replacement = `${key}=${remaining.get(key)}`;
    remaining.delete(key);
    return replacement;
  });
  for (const [key, value] of remaining) updated.push(`${key}=${value}`);
  fs.writeFileSync(envPath, `${updated.filter((line, index, all) => line || index < all.length - 1).join("\n")}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

function openBrowser(url) {
  const child = spawn("rundll32.exe", ["url.dll,FileProtocolHandler", url], {
    detached: true,
    stdio: "ignore",
    windowsHide: false,
  });
  child.unref();
}

async function exchangeCode(shop, code, config) {
  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      expiring: "0",
    }),
  });
  const body = await response.json();
  if (!response.ok || !body.access_token) {
    throw new Error(`Token exchange failed with HTTP ${response.status}.`);
  }
  return body;
}

async function main() {
  const config = getConfig();
  requireValues([
    ["SHOPIFY_CLIENT_ID", config.shopify.clientId],
    ["SHOPIFY_CLIENT_SECRET", config.shopify.clientSecret],
  ]);

  const state = crypto.randomBytes(24).toString("hex");
  let finished = false;
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url, redirectUri);
    if (requestUrl.pathname !== "/oauth/callback") {
      response.writeHead(404).end("Not found");
      return;
    }

    try {
      const shop = requestUrl.searchParams.get("shop") || "";
      const code = requestUrl.searchParams.get("code") || "";
      const returnedState = requestUrl.searchParams.get("state") || "";
      if (shop !== config.shopify.store) {
        throw new Error(`Shop domain did not match: received "${shop || "(missing)"}", expected "${config.shopify.store}".`);
      }
      if (!code) throw new Error("Shopify did not return an authorization code.");
      if (returnedState !== state) throw new Error("OAuth state verification failed.");
      if (!verifyHmac(requestUrl.searchParams, config.shopify.clientSecret)) throw new Error("OAuth HMAC verification failed.");

      const token = await exchangeCode(shop, code, config.shopify);
      updateEnv(config.envPath, {
        SHOPIFY_ADMIN_ACCESS_TOKEN: token.access_token,
        SHOPIFY_GRANTED_SCOPES: token.scope || "",
      });
      finished = true;
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end("<h1>Crunchy Girl Admin connected</h1><p>The Shopify token was stored locally. You can close this tab.</p>");
      process.stdout.write("Shopify authorization succeeded. The offline token was stored locally.\n");
      setTimeout(() => server.close(), 250);
    } catch (error) {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Authorization failed. Return to the terminal for details.");
      process.stderr.write(`Authorization failed: ${error.message}\n`);
      setTimeout(() => server.close(), 250);
    }
  });

  server.listen(3456, "127.0.0.1", () => {
    const authorizeUrl = new URL(`https://${config.shopify.store}/admin/oauth/authorize`);
    authorizeUrl.searchParams.set("client_id", config.shopify.clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", requestedScopes.join(","));
    authorizeUrl.searchParams.set("state", state);
    process.stdout.write("Opening Shopify authorization in your browser...\n");
    openBrowser(authorizeUrl.toString());
  });

  setTimeout(() => {
    if (!finished) {
      process.stderr.write("Authorization timed out. Run npm run shopify:auth to try again.\n");
      server.close();
    }
  }, timeoutMs).unref();
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
