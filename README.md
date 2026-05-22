# 4U2Sing Companion

Small TypeScript companion app for the existing `4u2sing.com.au` karaoke request site.

It does not replace the legacy site. It:

- searches the live karaoke catalogue through the existing presenter stream
- submits requests into the current karaoke request flow
- remembers prior requests
- stores ratings and notes for specific listed karaoke versions

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Clerk for login
- Convex for durable memory
- Vercel for deployment

## Local Commands

```bash
pnpm install
pnpm typecheck
pnpm lint
```

## Configure Convex

Run this once locally:

```bash
pnpm dlx convex dev
```

That will create or link the Convex project and generate the local environment values.

For production deploys:

```bash
pnpm dlx convex deploy
```

Environment variables expected by the app:

- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `NEXT_PUBLIC_CONVEX_URL` when developing locally
- `CONVEX_DEPLOY_KEY` in Vercel so builds can provision the correct Convex deployment
- `NEXT_PUBLIC_APP_URL` for local or custom-origin overrides only

Without `NEXT_PUBLIC_CONVEX_URL`, login still works but request history, singer-name memory, and version ratings will not persist.

## Configure Clerk

Install Clerk into the Vercel project or create a Clerk app directly, then set:

- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

Local development also needs those values in `.env.local`.

## Add Or Update Target Streams

Target streams live in [src/lib/stream-config.ts](/Users/mt/src/4u2sing/src/lib/stream-config.ts).

Each stream has:

- `slug`
- `label`
- `baseUrl`
- `searchPath`
- `submitPath`

Example:

```ts
{
  slug: "phil",
  label: "Phil",
  baseUrl: "https://4u2sing.com.au/phil",
  searchPath: "livesearch.php",
  submitPath: "submitreq-run.php",
}
```

This is intentionally lightweight. The current target stream is selected by URL, such as `/arran` or `/phil`, and is not stored as long-term user identity.

## Deploy To Vercel

This repo now includes [vercel.json](/Users/mt/src/4u2sing/vercel.json), which sets the Vercel build command to:

```bash
pnpm run build:vercel
```

That script runs:

```bash
convex deploy --cmd 'next build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

So Vercel builds will:

- deploy Convex functions
- create or reuse the correct Convex deployment
- inject `NEXT_PUBLIC_CONVEX_URL` into the frontend build
- build Next.js against the matching Convex environment

1. In the Convex dashboard, generate two deploy keys:

- one `Preview Deploy Key`
- one production deploy key

2. In Vercel, add these variables to the `Preview` environment:

- `CLERK_SECRET_KEY` using Clerk development keys
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` using Clerk development keys
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `CONVEX_DEPLOY_KEY` using the Convex preview deploy key

Vercel preview builds will then create a fresh Convex preview deployment automatically. Per Convex’s Vercel hosting docs, `convex deploy` uses the preview deploy key to create a branch-scoped preview backend and passes the generated URL into the frontend build as `NEXT_PUBLIC_CONVEX_URL`.

3. In Vercel, add these variables to the `Production` environment:

- `CLERK_SECRET_KEY` using Clerk production keys
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` using Clerk production keys
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- `CONVEX_DEPLOY_KEY` using the Convex production deploy key

4. For local development, run:

```bash
pnpm dlx convex dev
```

This writes your local `NEXT_PUBLIC_CONVEX_URL` into `.env.local`.

5. Deploy the Next.js app to Vercel.

## Preview Behavior

- Preview deployments are marked with a `Preview` badge in the header.
- Preview deployments are served with `noindex,nofollow` metadata so they do not get indexed.
- Preview and production should use different Clerk keys and different Convex deploy keys.

## Notes

- Search is proxied through `Next.js` route handlers to the existing karaoke site.
- Request submission is proxied to the existing `submitreq-run.php` flow.
- The legacy karaoke site remains unchanged.
