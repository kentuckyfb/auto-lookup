# Auto Lookup

A minimal vehicle lookup and guided-diagnosis interface. Auto Lookup combines free NHTSA data with CarsXE specifications, licensed image references, recalls, and user-supplied provider keys.

Known-issue coverage also includes Japan MLIT recall filings and owner defect-report summaries through Data Butler's no-auth verified-data API. These model-line records link back to the official filing and must be checked against the vehicle's chassis number before treating a recall as applicable.

## Cache-first request flow

1. Read the normalized record from Supabase.
2. On a cache miss, use the signed-in user's CarsXE key when connected.
3. Otherwise use the server's global CarsXE key.
4. Normalize the response and save it to Supabase before returning it.

Exact year/make/model lookups reuse the database record until its expiry time. Vehicle details and image references currently live for 30 days, recalls and complaint patterns for 7 days, and the free NHTSA catalogue for 180 days.

## Deploy with Vercel + Supabase

1. Import this repository into Vercel.
2. Install Supabase from the Vercel Marketplace and connect it to the project.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.
4. Add these Vercel Secret environment variables:
   - `CARSXE_API_KEY`
   - `CREDENTIAL_ENCRYPTION_KEY` — a random value of at least 32 characters
5. Confirm the Supabase integration added `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`.
6. In Supabase, open **Authentication → URL Configuration**:
   - Set **Site URL** to the production Vercel URL, for example `https://auto-lookup.vercel.app`.
   - Add that same production URL to **Redirect URLs**.
   - For Vercel previews, optionally add `https://*-kentuckyfb.vercel.app/**`.
7. Redeploy.

The browser handles Supabase's confirmation fragment, stores the session, removes the tokens from the visible URL, and opens the signed-in profile. New signups explicitly request the current site origin as their confirmation destination, so that origin must be in Supabase's redirect allow list.

User-provided CarsXE keys are verified once, encrypted with AES-256-GCM, and stored in `provider_connections`. Only their last four characters are returned to the browser.

Image binaries are not copied. The cache stores the image URL, source page, dimensions, MIME type, and requested license filter.

## Local preview

Load the values from `.env.example` into your shell, then run:

```powershell
node dev-server.mjs
```

Open `http://127.0.0.1:4174`.
