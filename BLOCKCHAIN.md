# On-chain anchoring via Alchemy (Polygon) — setup

SUTRA publishes every ledger action (passport issue, each journey event, certificates,
freeze, ownership claim) to a **public blockchain**, using **Alchemy** as the infrastructure
provider. Anyone can open a product's journey or proof page and click straight through to the
real transaction on Polygonscan.

**No weaver, co-op, or buyer ever touches a wallet, key, or gas.** One backend-held account
signs and pays for every anchor automatically through Alchemy. Non-technical users never see
the blockchain — Alchemy and the backend handle all of it.

Anchoring is **off by default** (the app runs on the local hash-chained ledger). Turning it on
is free on the Polygon **Amoy testnet**.

## Activate (free, ~5 minutes)

1. **Create a free Alchemy app + API key**

   - Sign up at https://dashboard.alchemy.com/
   - Create an app → Chain: **Polygon**, Network: **Polygon Amoy**.
   - Copy the **API key** into `.env.local`:

     ```
     ALCHEMY_API_KEY=your_alchemy_key
     ```

   All chain reads and transaction submission now run through Alchemy's endpoint
   (`https://polygon-amoy.g.alchemy.com/v2/…`) — no code changes, the app builds the URL for you.

2. **Create the backend anchoring wallet**

   ```bash
   npm run wallet:new
   ```

   Copy the printed **private key** into `.env.local`:

   ```
   CHAIN_PRIVATE_KEY=0x......
   ```

3. **Fund the wallet address** with free test POL (no card, no purchase):

   - https://faucet.polygon.technology/ → select **Polygon Amoy** → paste the wallet **address**.
   - ~0.5–1 POL is enough for thousands of anchors (each costs a fraction of a cent).

4. **Turn it on** in `.env.local` and restart `npm run dev`:

   ```
   CHAIN_ENABLED=true
   CHAIN_NETWORK=amoy
   CHAIN_CONFIRMATIONS=1
   ```

From now on every new action is written to Polygon through Alchemy in the background. The
**Admin → Overview** page shows `Polygon Amoy via Alchemy`, the wallet balance, and how many
records are confirmed / pending on chain.

## What you'll see

- **Journey page** (`/p/{id}/journey`): each step shows a green **"On Polygon Amoy · block N"**
  chip linking to the transaction on Polygonscan; "Writing to the public chain…" while it mines.
- **Proof page** (`/p/{id}/proof`): every ledger entry links to its on-chain transaction.
- **Admin overview**: live confirmed / pending / failed counts + wallet balance, marked *via Alchemy*.

## How it works

- Each ledger entry carries a SHA-256 `entryHash`. When anchoring is on, the backend submits a
  tiny transaction through **Alchemy** from the platform wallet with that hash in the calldata
  (prefixed with the marker `SUTRA`). The transaction is public and immutable; anyone can read
  the 32-byte hash on Polygonscan and check it matches.
- Anchoring is **fire-and-forget** — the weaver's tap returns instantly; the ~2-second
  confirmation happens in the background and the page updates when it lands.
- Transactions are **serialized** through one queue so nonces never collide.
- If the server restarts mid-anchor or Alchemy is briefly unreachable, entries stay
  `PENDING`/`FAILED`. Hit `POST /api/cron/anchor` (optionally `?secret=CRON_SECRET`) to retry —
  wire it to a scheduler in production. If the chain is unreachable, the app still works fully on
  the local ledger and shows records as pending — it never fails the user.

## Optional upgrade: Alchemy Gas Manager (fully sponsored gas)

Right now the backend wallet pays gas itself (free test POL on Amoy). If you want Alchemy to
**sponsor the gas** so the account holds zero tokens, that's Alchemy's **Gas Manager** — it
requires moving to an ERC-4337 smart account (Account Kit + Bundler), per SRS §3.8. It's a
larger change and not needed on testnet (faucet gas is free), but it's the natural next step for
mainnet. Ask and it can be added — the anchoring flow and all the UI stay exactly the same.

## Going to mainnet

Set `CHAIN_NETWORK=polygon`, create an Alchemy **Polygon Mainnet** app for the API key, and fund
the wallet with real POL (~₹0.02–0.30 per transaction — well within the project's unit economics).
Keep the private key in a secrets manager (KMS), never in the repo.
