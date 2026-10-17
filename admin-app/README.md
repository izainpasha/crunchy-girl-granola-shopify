# Crunchy Girl Admin

A private local management app for the Crunchy Girl Granola store. Shopify's canonical Admin API domain is `fxeic1-in.myshopify.com`.

It intentionally uses two APIs:

- Shopify Admin GraphQL for products and purchase options.
- Seal Subscriptions Merchant API for subscriptions already owned by Seal.

The app has no third-party runtime dependencies. Write commands require `--confirm`, and credentials are loaded only from the ignored `.env` file.

## One-time setup

1. The Dev Dashboard app **Crunchy Girl Admin** is linked through `shopify.app.toml`.
2. Deploy and release these scopes:
   `read_products,write_products,read_purchase_options,write_purchase_options`
3. Install it on `crunchy-girl-granola.myshopify.com`.
4. Run `npm run configure`. The secure prompts collect the Shopify client secret and Seal token without printing either value, then start Shopify's one-time authorization-code flow.
5. Approve Shopify access in the browser. The resulting non-expiring offline Admin API token is stored only in the ignored `.env` file.
6. Run `npm run doctor:live`.

Never commit `.env` or paste its secrets into chat, tickets, or logs.

## Common commands

```powershell
npm run doctor
npm run doctor:live
npm run products
npm run subscriptions
node src/cli.mjs shopify products list --query apple
node src/cli.mjs seal subscription get --id 12345
```

Product update payload (`product.json`):

```json
{
  "title": "Updated title",
  "status": "ACTIVE"
}
```

```powershell
node src/cli.mjs shopify product update --id gid://shopify/Product/123 --data product.json --confirm
```

Seal subscription actions:

```powershell
node src/cli.mjs seal subscription action --id 12345 --action pause --confirm
node src/cli.mjs seal subscription action --id 12345 --action resume --confirm
node src/cli.mjs seal subscription action --id 12345 --action cancel --confirm
node src/cli.mjs seal subscription action --id 12345 --action reactivate --confirm
```

For Shopify operations not covered by a shortcut, save an Admin GraphQL query or mutation to a file and use `shopify graphql`. Mutations require `--confirm`. For other documented Seal endpoints, use `seal request`; non-GET methods require `--confirm`.
