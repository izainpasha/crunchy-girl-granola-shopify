import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseEnv(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function loadEnvironment() {
  const envPath = path.join(appRoot, ".env");
  if (fs.existsSync(envPath)) {
    const fileValues = parseEnv(fs.readFileSync(envPath, "utf8"));
    for (const [key, value] of Object.entries(fileValues)) {
      if (process.env[key] === undefined) process.env[key] = value;
    }
  }
  return envPath;
}

export function getConfig() {
  const envPath = loadEnvironment();
  const store = (process.env.SHOPIFY_STORE || "fxeic1-in.myshopify.com")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(store)) {
    throw new Error("SHOPIFY_STORE must be a *.myshopify.com domain.");
  }

  return {
    appRoot,
    envPath,
    shopify: {
      store,
      clientId: process.env.SHOPIFY_CLIENT_ID || "",
      clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
      adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
      grantedScopes: process.env.SHOPIFY_GRANTED_SCOPES || "",
      apiVersion: process.env.SHOPIFY_API_VERSION || "2026-07",
    },
    seal: {
      token: process.env.SEAL_API_TOKEN || "",
      baseUrl: (process.env.SEAL_API_BASE_URL || "https://app.sealsubscriptions.com/shopify/merchant/api").replace(/\/$/, ""),
    },
  };
}

export function requireValues(entries) {
  const missing = entries.filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) {
    throw new Error(`Missing ${missing.join(", ")}. Add it to .env (see .env.example).`);
  }
}
