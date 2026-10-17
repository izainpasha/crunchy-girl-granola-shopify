import fs from "node:fs";
import { getConfig, requireValues } from "./config.mjs";

async function parseResponse(response) {
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Shopify returned HTTP ${response.status} with a non-JSON response.`);
  }
  if (!response.ok) {
    const detail = body.error_description || body.error || body.errors || response.statusText;
    throw new Error(`Shopify returned HTTP ${response.status}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  return body;
}

export async function getAdminAccessToken() {
  const { shopify } = getConfig();
  requireValues([["SHOPIFY_ADMIN_ACCESS_TOKEN", shopify.adminAccessToken]]);
  return shopify.adminAccessToken;
}

export async function graphql(query, variables = {}) {
  const { shopify } = getConfig();
  const token = await getAdminAccessToken();
  const response = await fetch(`https://${shopify.store}/admin/api/${shopify.apiVersion}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await parseResponse(response);
  if (body.errors?.length) throw new Error(`Shopify GraphQL error: ${JSON.stringify(body.errors)}`);
  return body.data;
}

export async function getShopIdentity() {
  return graphql(`query AppDoctor { shop { name myshopifyDomain } }`);
}

export async function listProducts({ first = 25, query = null } = {}) {
  return graphql(
    `query Products($first: Int!, $query: String) {
      products(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
        nodes {
          id
          handle
          title
          status
          vendor
          productType
          updatedAt
          variants(first: 20) {
            nodes { id title sku price availableForSale }
          }
          sellingPlanGroups(first: 10) {
            nodes {
              id
              name
              sellingPlans(first: 10) { nodes { id name } }
            }
          }
        }
      }
    }`,
    { first: Math.min(Math.max(Number(first) || 25, 1), 100), query: query || null },
  );
}

export async function updateProduct(id, patch) {
  const product = { ...patch, id };
  const data = await graphql(
    `mutation UpdateProduct($product: ProductUpdateInput!) {
      productUpdate(product: $product) {
        product { id handle title status vendor productType updatedAt }
        userErrors { field message }
      }
    }`,
    { product },
  );
  if (data.productUpdate.userErrors.length) {
    throw new Error(`Product update rejected: ${JSON.stringify(data.productUpdate.userErrors)}`);
  }
  return data;
}

export function readGraphqlRequest(queryPath, variablesPath) {
  const query = fs.readFileSync(queryPath, "utf8");
  const variables = variablesPath ? JSON.parse(fs.readFileSync(variablesPath, "utf8")) : {};
  return { query, variables };
}
