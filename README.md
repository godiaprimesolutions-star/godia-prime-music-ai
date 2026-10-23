# GODIA PRIME MUSIC AI — Netlify backend package

This package preserves the supplied GODIA PRIME MUSIC AI page and adds the smallest Netlify project scaffold for GitHub deployment. It does not replace the product UI or contain any secrets.

## What is included
- `index.html` — the existing page, preserved with one additional **Generate Real Audio (AI)** action. Existing blueprint/library behavior remains.
- `netlify/functions/music-generate.mjs` — server-side Hugging Face endpoint adapter. It requires a model endpoint compatible with the request/response described below.
- `netlify/functions/mpesa-stkpush.mjs` — server-side Daraja STK Push request. Server calculates the order amount (KSh 250 per song, plus KSh 100 for advanced studio) rather than trusting the browser amount.
- `netlify/functions/mpesa-callback.mjs` — receives callback and stores it against a known checkout request.
- `netlify/functions/mpesa-status.mjs` — asks Daraja to verify the checkout status and marks a transaction paid only when Daraja returns ResultCode `0`.
- `netlify.toml`, `.gitignore`, `.env.example`, `package.json`.

## Important limitations before production
1. This is an integration scaffold, not proof that your account is production-ready. Test with Daraja sandbox first. Confirm your shortcode type, transaction type, passkey, callback URL and live permissions with Safaricom. For a Buy Goods till, `CustomerBuyGoodsOnline` and the `PartyB`/shortcode behavior must match your Daraja product setup.
2. The customer-facing till in the page is `1692851`; confirm it is the correct business till. STK Push shortcode configuration may have requirements distinct from a manually entered Buy Goods till. Do not accept payments until this is verified.
3. Netlify Blobs is used for the initial transaction store. It is not a complete customer/song entitlement database. Before selling at scale, add stronger order-to-user/download authorization, idempotency, retention controls, and monitoring. Callback is public by design; do not trust callback payload alone. The status function queries Daraja before marking paid.
4. Hugging Face does not have one universal music-generation request format. Set `HF_MUSIC_ENDPOINT` to an audio-generation inference endpoint that accepts JSON `{ "inputs": "..." }` and returns audio bytes (or JSON containing `audioUrl`/`audioBase64`). Many models need a different payload or dedicated provider. The function intentionally reports an error rather than pretending an unsupported model generated audio. Confirm the model's license and inference availability.
5. The current page still creates a music brief/blueprint locally. Real audio generation happens only after the compatible model endpoint is configured and tested. This package does not yet implement paid-download unlocking or permanent audio hosting.

## Deploy from GitHub on Android
1. Upload the contents of this folder to the root of your GitHub repository. `index.html` must be at the repository root. Do not upload `.env` or real credentials.
2. In Netlify, import/connect that GitHub repository. Build command can be left blank; publish directory is `.`. `netlify.toml` defines the functions folder.
3. In Netlify site settings, add environment variables from the names in `.env.example`. Enter real values directly in Netlify only. Set `MPESA_ENV=sandbox` for initial tests. Set `URL` to the site's public HTTPS origin (for example, `https://your-site.netlify.app`, without a trailing slash).
4. Redeploy after adding or changing variables.
5. Test music endpoint separately. Then test Daraja sandbox STK Push and callback/status flow. Do not use live money until the sandbox flow, shortcode and production setup are confirmed.

## Environment variables
- `HF_TOKEN`: Hugging Face access token.
- `HF_MUSIC_ENDPOINT`: compatible HTTPS model endpoint URL.
- `MPESA_ENV`: `sandbox` or `production`.
- `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`.
- `MPESA_TRANSACTION_TYPE`: default `CustomerBuyGoodsOnline`; confirm for your account.
- `URL`: public Netlify site origin used to build the callback URL.

**Never put these values in `index.html`, source code, screenshots, public chat, or GitHub.** If a secret was previously exposed, rotate it in the provider dashboard.
