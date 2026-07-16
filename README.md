# SUTRA — Handloom Provenance, Authenticity & Weaver Story Platform

Local build of the SUTRA SRS (v1.0): **website + MongoDB only** — no blockchain, no cloud services.

## What's swapped vs the SRS

| SRS component | This build |
|---|---|
| Polygon + Alchemy (on-chain anchors) | **Hash-chained, append-only `ledgerEntries` collection** — same tamper-evidence model, verified live on the proof page |
| IPFS (Pinata) + Cloudflare R2 | Local `uploads/` directory served via `/api/media/[id]` |
| SMS OTP (MSG91/Twilio) | Dev-mode OTP shown on the login screen |
| Vercel Cron workers | Risk scoring runs inline on the events that matter (claims, reports) |

## Run it

```bash
# MongoDB must be running on localhost:27017
npm install
npm run seed     # wipes & seeds the `sutra` db; writes DEMO.md with logins + tag secrets
npm run dev      # http://localhost:3000
```

## Demo walkthrough

1. **Consumer**: open a passport URL from `DEMO.md` (`/p/{id}`) — verdict, weaver story, journey, proof page.
2. **Claim + clone alarm**: claim an unclaimed piece with its secret; then claim the already-claimed one → 409 counterfeit alert → check `/admin/fraud`.
3. **Weaver** (phone `9111111111`): dashboard, 4-tap registration with camera + voice note, insights.
4. **Co-op** (`9000000002`): roster, assisted registration, dispatch custody (seals records).
5. **Verifier** (`9000000003`): attest the pending weaver Selvi in `/admin/verify`.
6. **Admin** (`9000000001`): overview with live ledger-chain verification, fraud queue.

Login = phone number → OTP shown on screen (dev mode).
