# BSFS Internal — Deployment Guide

## Prerequisites

- Node.js 18+
- A [Convex](https://dashboard.convex.dev) account with a production deployment
- A hosting platform for the frontend (Vercel, Netlify, etc.)

---

## 1. Convex Production Deployment

### Create a production deployment

If you haven't already, create a production deployment from your Convex dashboard or via the CLI:

```bash
npx convex deploy
```

This will prompt you to select (or create) a production deployment and push your functions.

---

## 2. Environment Variables — Convex Server

These must be set in the **Convex dashboard** under your production deployment's **Settings > Environment Variables**.

### `JWT_PRIVATE_KEY` (required for auth)

`@convex-dev/auth` uses JWTs to manage sessions. In development Convex auto-generates this, but **in production you must provide your own key**.

Generate an RS256 private key:

```bash
openssl genrsa -out private_key.pem 2048
```

Then copy the contents into the Convex dashboard as the `JWT_PRIVATE_KEY` environment variable. Make sure to include the full PEM content including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines.

> Alternatively, you can generate it inline and copy from stdout:
> ```bash
> openssl genrsa 2048
> ```

### `JWKS` (required for auth)

Extract the public key in JWKS format from your private key. The `@convex-dev/auth` library provides a helper:

```bash
npx @convex-dev/auth jwks < private_key.pem
```

Copy the JSON output and set it as the `JWKS` environment variable in the Convex dashboard.

### `CONVEX_SITE_URL` (required for auth)

Set this to your production Convex HTTP actions URL. You can find it in the Convex dashboard under your deployment. It follows this format:

```
https://<your-deployment>.convex.site
```

### `MASSIVE_API_KEY` (required for stocks)

Your Massive.com API key for the stocks feature. Set this in the Convex dashboard.

---

## 3. Environment Variables — Frontend Hosting

These must be set in your frontend hosting platform (Vercel, Netlify, etc.) as build-time environment variables.

### `VITE_CONVEX_URL` (required)

Your production Convex deployment URL:

```
https://<your-deployment>.convex.cloud
```

### `VITE_CONVEX_SITE_URL` (required)

Your production Convex HTTP actions URL (same value as `CONVEX_SITE_URL` above):

```
https://<your-deployment>.convex.site
```

---

## 4. Deploy the Frontend

### Build command

```bash
npm run build
```

### Output directory

```
dist
```

### Framework preset

If using Vercel or Netlify, select **Vite** as the framework preset.

### SPA routing

Since this is a single-page app with client-side routing, configure your hosting to redirect all routes to `index.html`:

- **Vercel**: Add a `vercel.json`:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```
- **Netlify**: Add a `netlify.toml`:
  ```toml
  [[redirects]]
    from = "/*"
    to = "/index.html"
    status = 200
  ```

---

## 5. Summary Checklist

| Variable | Where | Required |
|---|---|---|
| `JWT_PRIVATE_KEY` | Convex dashboard | Yes (auth) |
| `JWKS` | Convex dashboard | Yes (auth) |
| `CONVEX_SITE_URL` | Convex dashboard | Yes (auth) |
| `MASSIVE_API_KEY` | Convex dashboard | Yes (stocks) |
| `VITE_CONVEX_URL` | Frontend hosting | Yes |
| `VITE_CONVEX_SITE_URL` | Frontend hosting | Yes |

---

## 6. Deploying Convex Functions

Whenever you update backend functions, deploy them with:

```bash
npx convex deploy
```

This pushes your `convex/` directory to the production deployment.

---

## Troubleshooting

### "JWT private key is missing from environment variables"

You need to set `JWT_PRIVATE_KEY` and `JWKS` in the Convex dashboard for your production deployment. See step 2 above.

### Auth works locally but not in production

In development, Convex auto-provisions auth keys. In production, you must manually set `JWT_PRIVATE_KEY`, `JWKS`, and `CONVEX_SITE_URL` in the Convex dashboard.

### Stocks data not loading

Ensure `MASSIVE_API_KEY` is set in the Convex dashboard for your production deployment.
