# SUTRA — Handloom Provenance, Authenticity & Weaver Story Platform

Local build of the SUTRA SRS (v1.0): a Next.js website on a local MongoDB, with
**optional** on-chain anchoring to Polygon via Alchemy (off by default).

## SRS

| SRS component | This build |
|---|---|
| Polygon + Alchemy (on-chain anchors) | A hash-chained, append-only `ledgerEntries` collection, verified live on the proof page. When enabled, every entry is **also** anchored on Polygon via Alchemy (see `BLOCKCHAIN.md`). Off by default. |
| ERC-4337 smart accounts + Gas Manager | One custodial backend wallet signs and pays for every anchor — no user ever touches a wallet, key, or gas |
| IPFS (Pinata) + Cloudflare R2 | Local `uploads/` directory served via `/api/media/[id]` |
| SMS OTP (MSG91/Twilio) | Dev-mode OTP shown on the login screen |
| Vercel Cron workers | Risk scoring runs inline on the events that matter (claims, reports); on-chain retries via `/api/cron/anchor` |

## What's built

- **Weaver identity** — assisted registration by a co-op, physical verification (verifier attest), credential revocation, public weaver profile.
- **Product registration** — 4-tap flow (photo + craft + category + voice note), a full enrichment form (dimensions, weave, thread count, colours, motifs, production hours, GI tag, story), certificate attachment (Silk Mark / Handloom Mark / GI / …), passport issue, and freeze-on-dispatch.
- **Materials traceability** — the weaver registers their own yarn / zari / dye lots; links them to a piece by role and grams; over-consumption is rejected; shown as "Traceable materials" on the public page.
- **Tagging** — QR + an 8-character scratch secret (only its hash is stored).
- **Provenance & custody** — append-only journey events; custody transfer to a retailer (dispatch seals the record; an item dispatches once).
- **Public verification** (`/p/{id}`) — weaver sidebar + product photo, specs, traceable materials and the story inline; journey timeline; proof page (live hash-chain check + on-chain links); ownership claim (name + phone required) with a duplicate-claim clone alarm.
- **My purchases** (`/purchases`) — a buyer looks up everything they've claimed by phone number.
- **Fraud & admin** — consumer fraud report, risk scoring, admin fraud console, verification queue, and an ops overview.
- **Integrity ledger** — hash-chained locally; optionally anchored to Polygon (Alchemy) with block/tx links rendered on the journey and proof pages.

Portals: `/w` (weaver), `/coop` (co-op / retailer), `/admin` (admin / verifier); roles enforced by `middleware.ts`.

## Run it

```bash
# MongoDB must be running on localhost:27017
npm install
npm run seed     # wipes & seeds the `sutra` db; writes DEMO.md with logins + tag secrets
npm run dev      # http://localhost:3000
```

Login = phone number → OTP shown on screen (dev mode). All demo logins and tag secrets are in `DEMO.md`.

## Optional: on-chain anchoring via Alchemy

Off by default. To publish every action to Polygon automatically (no user touches the chain),
follow `BLOCKCHAIN.md` — free on the Amoy testnet: `npm run wallet:new` → fund from the faucet →
set `ALCHEMY_API_KEY` + `CHAIN_ENABLED=true` → restart. Journey and proof pages then show
"On Polygon Amoy · block N" links, and the admin overview shows the wallet balance and anchor status.

## Demo walkthrough

1. **Consumer**: open a passport URL from `DEMO.md` (`/p/{id}`) — verdict, weaver story, materials, journey, proof.
2. **Claim + clone alarm**: claim an unclaimed piece with its secret (name + phone required); then claim the already-claimed one → 409 counterfeit alert → check `/admin/fraud`.
3. **My purchases**: search the phone number you claimed with at `/purchases`.
4. **Weaver** (`9111111111`): dashboard, 4-tap registration, product details & certificates, material lots, insights.
5. **Co-op** (`9000000002`): roster, assisted registration, dispatch custody (seals records).
6. **Verifier** (`9000000003`): attest the pending weaver in `/admin/verify`.
7. **Admin** (`9000000001`): overview with live ledger-chain verification, on-chain status, fraud queue.

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run seed` — reset and seed the database (writes `DEMO.md`)
- `npm run wallet:new` — generate a backend anchoring wallet (for on-chain anchoring)
