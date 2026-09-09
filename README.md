# CapTuto

Create professional tutorials in seconds. Record your screen while talking, and CapTuto automatically generates a step-by-step guide with screenshots and text.

## Autonomous web tutorials

The portable [Captuto skill](skills/captuto/SKILL.md) lets Codex or Claude Code perform a web workflow with agent-browser, upload native Captuto captures, write the steps and inspect editable annotations. It can continue existing tutorials across multiple websites. Published tutorials get a private revision; publishing it keeps the original public link.

Copy `skills/captuto` to your agent's skills directory and follow [connection setup](skills/captuto/references/setup.md). The helper requires Node.js 20+, agent-browser, `CAPTUTO_URL` and `CAPTUTO_API_TOKEN`. Ask the agent, for example: “Use Captuto to make a tutorial for inviting a teammate on this website.”

Capture files and upload progress remain in the chosen local directory for resuming interruptions. Publication requires the user's go. This first version controls web applications; it can edit existing Mac captures, with native application control planned separately.

Apply the repository migrations before using the new MCP tools. Validation:

```sh
node --test skills/captuto/scripts/capture.test.mjs
pnpm --filter @captuto/web test:run
# After signing in to localhost with agent-browser session captuto-autonomous:
node scripts/test-autonomous-capture.mjs
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React
- **Styling**: Tailwind CSS + shadcn/ui
- **Extension**: Chrome Extension (Manifest V3)
- **Backend**: Next.js API Routes
- **Database**: Supabase (Postgres)
- **Storage**: Supabase Storage
- **Transcription**: Deepgram
- **Auth**: Supabase Auth
- **Billing**: Stripe Checkout + Customer Portal

## Project Structure

```
captuto/
├── apps/
│   ├── web/              # Next.js app
│   └── extension/        # Chrome extension
├── packages/
│   └── shared/           # Shared types
├── supabase/             # Database migrations
└── ...
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase account
- Deepgram account (for transcription)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp apps/web/.env.example apps/web/.env.local
```

#### Required variables

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | [Supabase Dashboard](https://supabase.com/dashboard) → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public) | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (secret) | Same as above |
| `DEEPGRAM_API_KEY` | Deepgram API key | [Deepgram Console](https://console.deepgram.com) |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key | [Stripe Dashboard](https://dashboard.stripe.com/apikeys) |
| `STRIPE_PRICE_ID` | Recurring Stripe Price used for Checkout | Stripe product price settings |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for `/api/billing/webhook` | Stripe webhook endpoint settings |
| `NEXT_PUBLIC_APP_URL` | App URL | `http://localhost:3678` for dev |

### 3. Run the development server

```bash
./scripts/dev-start.sh
```

Open [http://localhost:3678](http://localhost:3678) in your browser.

## Development

### Commands

```bash
# Start development server
./scripts/dev-start.sh

# Build for production
pnpm build

# Run linter
pnpm lint
```

### Monorepo

This project uses [Turborepo](https://turbo.build/repo) for monorepo management.

## License

Private - The Vibe Company
