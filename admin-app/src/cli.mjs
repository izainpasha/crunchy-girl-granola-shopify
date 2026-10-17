import fs from "node:fs";
import path from "node:path";
import { getConfig } from "./config.mjs";
import { getShopIdentity, graphql, listProducts, readGraphqlRequest, updateProduct } from "./shopify.mjs";
import { getSubscription, listSubscriptions, sealRequest, subscriptionAction } from "./seal.mjs";

function parseArgs(args) {
  const positional = [];
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      flags[key] = next;
      index += 1;
    } else {
      flags[key] = true;
    }
  }
  return { positional, flags };
}

function asBool(value) {
  if (value === undefined) return undefined;
  if (value === true) return true;
  return value === "true" || value === "1";
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function requireFlag(flags, name) {
  if (flags[name] === undefined) throw new Error(`Missing required --${name}.`);
  return flags[name];
}

function requireConfirmation(flags, description) {
  if (flags.confirm !== true) {
    throw new Error(`${description} is a write operation. Re-run with --confirm after reviewing the target and payload.`);
  }
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function help() {
  process.stdout.write(`Crunchy Girl Admin\n\nRead operations:\n  npm run doctor\n  npm run doctor:live\n  node src/cli.mjs shopify products list [--first 25] [--query apple]\n  node src/cli.mjs shopify graphql --query request.graphql [--variables variables.json]\n  node src/cli.mjs seal subscriptions list [--page 1] [--query email] [--with-items true]\n  node src/cli.mjs seal subscription get --id 123\n\nWrite operations (explicit confirmation required):\n  node src/cli.mjs shopify product update --id gid://shopify/Product/123 --data product.json --confirm\n  node src/cli.mjs shopify graphql --query mutation.graphql --variables variables.json --confirm\n  node src/cli.mjs seal subscription action --id 123 --action pause --confirm\n  node src/cli.mjs seal request --method PUT --path /subscription --data request.json --confirm\n`);
}

async function doctor(live) {
  const config = getConfig();
  const result = {
    store: config.shopify.store,
    apiVersion: config.shopify.apiVersion,
    envFile: config.envPath,
    shopifyConfigured: Boolean(config.shopify.clientId && config.shopify.clientSecret),
    sealConfigured: Boolean(config.seal.token),
  };
  if (live && result.shopifyConfigured) result.shopify = await getShopIdentity();
  if (live && result.sealConfigured) {
    const response = await listSubscriptions({ page: 1 });
    const subscriptions = Array.isArray(response?.payload) ? response.payload : response?.payload?.subscriptions;
    result.seal = { authenticated: response?.success !== false, firstPageCount: Array.isArray(subscriptions) ? subscriptions.length : undefined };
  }
  print(result);
}

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional.join(" ");

  if (!command || command === "help") return help();
  if (command === "doctor") return doctor(flags.live === true);

  if (command === "shopify products list") {
    return print(await listProducts({ first: flags.first, query: flags.query }));
  }
  if (command === "shopify product update") {
    requireConfirmation(flags, "Product update");
    const id = requireFlag(flags, "id");
    const patch = readJson(requireFlag(flags, "data"));
    delete patch.id;
    return print(await updateProduct(id, patch));
  }
  if (command === "shopify graphql") {
    const request = readGraphqlRequest(requireFlag(flags, "query"), flags.variables);
    if (/\bmutation\b/i.test(request.query)) requireConfirmation(flags, "GraphQL mutation");
    return print(await graphql(request.query, request.variables));
  }

  if (command === "seal subscriptions list") {
    return print(await listSubscriptions({
      page: flags.page,
      query: flags.query,
      activeOnly: asBool(flags["active-only"]),
      pausedOnly: asBool(flags["paused-only"]),
      cancelledOnly: asBool(flags["cancelled-only"]),
      withItems: asBool(flags["with-items"]),
      withBillingAttempts: asBool(flags["with-billing-attempts"]),
    }));
  }
  if (command === "seal subscription get") {
    return print(await getSubscription(requireFlag(flags, "id")));
  }
  if (command === "seal subscription action") {
    requireConfirmation(flags, "Subscription action");
    return print(await subscriptionAction(requireFlag(flags, "id"), requireFlag(flags, "action")));
  }
  if (command === "seal request") {
    const method = String(flags.method || "GET").toUpperCase();
    if (method !== "GET") requireConfirmation(flags, `Seal ${method} request`);
    return print(await sealRequest(method, requireFlag(flags, "path"), {
      body: flags.data ? readJson(flags.data) : undefined,
    }));
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`Error: ${error.message}\n`);
  process.exitCode = 1;
});
