# SUTRA — Every thread has a story

**Digital Product Passports for genuine Indian handloom.**
Scan the tag, meet the weaver, verify the craft — backed by in-person verification and a
tamper-evident record anchored on a public blockchain.

🔗 **Live pilot:** [handloom-gray.vercel.app](https://handloom-gray.vercel.app) ·
▶️ **Interactive product journey:** [handloom-gray.vercel.app/how-it-works](https://handloom-gray.vercel.app/how-it-works)

---

## 🧭 The product journey

> **Tip:** hover the diagram on GitHub and use its controls to **zoom, pan or open it full screen**.

```mermaid
%%{init: {"theme": "base", "flowchart": {"curve": "basis", "nodeSpacing": 30, "rankSpacing": 42, "padding": 12, "subGraphTitleMargin": {"top": 6, "bottom": 10}}, "themeVariables": {"fontFamily": "Georgia, serif", "fontSize": "16px", "lineColor": "#b8860b", "edgeLabelBackground": "#fffaf2", "clusterBkg": "#fffaf2", "clusterBorder": "#e5c383"}}}%%
flowchart TD
    START(["🧶 &nbsp;<b>A saree begins on the loom</b>"]):::start

    subgraph S1["① &nbsp;ONBOARD & VERIFY"]
        direction LR
        A["🏛️ <b>Co-op onboards<br/>the weaver</b><br/><small>assisted · ID kept as a hash</small>"]:::coop
        B{"🛡️ <b>Verifier checks<br/>at the loom</b>"}:::decide
        OK["✅ <b>Verified weaver</b><br/><small>🔗 WEAVER_ATTESTED</small>"]:::good
        NO(["🚫 Rejected or revoked<br/><small>no passports</small>"]):::bad
        A --> B
        B -->|"pass"| OK
        B -->|"fail"| NO
    end

    subgraph S2["② &nbsp;MAKE & PASSPORT &nbsp;·&nbsp; weaver, four taps"]
        direction LR
        C["📸 <b>Register</b><br/><small>photo · craft · voice<br/>🔗 MATERIAL_REGISTERED</small>"]:::weaver
        D["🪪 <b>Digital Passport</b><br/><small>QR + scratch secret<br/>🔗 PASSPORT_ISSUED</small>"]:::weaver
        E["🪡 <b>Journey</b><br/><small>weave · finish · QC<br/>🔗 PROVENANCE_EVENT</small>"]:::weaver
        C --> D --> E
    end

    subgraph S3["③ &nbsp;SEAL &nbsp;·&nbsp; co-op dispatch"]
        direction LR
        F["🚚 <b>Custody to retailer</b><br/><small>moves exactly once</small>"]:::coop
        F2["🔒 <b>Record sealed</b><br/><small>no more edits<br/>🔗 PASSPORT_FROZEN</small>"]:::seal
        F --> F2
    end

    subgraph S4["④ &nbsp;SCAN & CLAIM &nbsp;·&nbsp; buyer, no app"]
        direction LR
        G["📱 <b>Scan</b>"]:::buyer
        H{"🟢 <b>Verdict</b>"}:::decide
        I["💛 <b>Meet the maker</b><br/><small>face · voice · journey</small>"]:::buyer
        J{"🔑 <b>Claim with<br/>secret</b>"}:::decide
        K(["🎉 <b>It's yours</b><br/><small>🔗 OWNERSHIP_CLAIMED</small>"]):::good
        CAUTION(["⚠️ Caution<br/><small>under review</small>"]):::warn
        ALARM(["🚨 <b>Clone alarm</b><br/><small>tag already claimed</small>"]):::bad
        G --> H
        H -->|"genuine"| I --> J
        H -->|"flagged"| CAUTION
        J -->|"first claim"| K
        J -->|"duplicate"| ALARM
    end

    subgraph S5["⑤ &nbsp;FRAUD GUARD &nbsp;·&nbsp; automatic"]
        direction LR
        R["📊 <b>Risk score 0–100</b><br/><small>scan bursts · geo-spread<br/>failed claims · reports</small>"]:::trust
        Q["🧑‍💼 <b>Admin fraud queue</b><br/><small>investigate</small>"]:::admin
        V(["🗃️ Clear or void<br/><small>verdict updates everywhere</small>"]):::admin
        R --> Q --> V
    end

    START --> S1
    S1 ==>|"&nbsp;verified weavers only&nbsp;"| S2
    S2 ==>|"&nbsp;finished piece&nbsp;"| S3
    S3 ==>|"&nbsp;on the shelf&nbsp;"| S4
    S4 -.->|"&nbsp;every scan · alarms · reports&nbsp;"| S5

    classDef start fill:#40101a,stroke:#e5c383,stroke-width:2px,color:#f8eeda
    classDef coop fill:#f8eeda,stroke:#8a6224,stroke-width:1.5px,color:#40101a
    classDef weaver fill:#fbe9ec,stroke:#8c2f39,stroke-width:1.5px,color:#40101a
    classDef seal fill:#40101a,stroke:#e5c383,stroke-width:1.5px,color:#f8eeda
    classDef buyer fill:#eaf6ee,stroke:#0d7a3f,stroke-width:1.5px,color:#0a3d20
    classDef decide fill:#fff4d6,stroke:#b8860b,stroke-width:2px,color:#40101a
    classDef trust fill:#2a0a11,stroke:#e5c383,stroke-width:1.5px,color:#f8eeda
    classDef good fill:#0d7a3f,stroke:#0a6132,stroke-width:2px,color:#ffffff
    classDef warn fill:#fff1e0,stroke:#c2410c,stroke-width:1.5px,color:#7c2d12
    classDef bad fill:#fdecea,stroke:#b42318,stroke-width:2px,color:#7a1c12
    classDef admin fill:#ede9f7,stroke:#5b4b9a,stroke-width:1.5px,color:#2b2150

    style S1 fill:#fffaf2,stroke:#e5c383,stroke-width:1.5px,color:#8a6224
    style S2 fill:#fff5f6,stroke:#e8b4bc,stroke-width:1.5px,color:#8c2f39
    style S3 fill:#fffaf2,stroke:#e5c383,stroke-width:1.5px,color:#8a6224
    style S4 fill:#f4fbf6,stroke:#9fd4b3,stroke-width:1.5px,color:#0a6132
    style S5 fill:#f6f3fc,stroke:#c4b8e8,stroke-width:1.5px,color:#5b4b9a
```

<sub>🔗 = a record written to the hash-chained ledger and anchored on Polygon.</sub>

### 🔐 What happens under the hood

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Georgia, serif", "fontSize": "15px", "actorBkg": "#40101a", "actorBorder": "#e5c383", "actorTextColor": "#f8eeda", "actorLineColor": "#e5c383", "signalColor": "#b8860b", "signalTextColor": "#40101a", "labelBoxBkgColor": "#f8eeda", "labelBoxBorderColor": "#8a6224", "labelTextColor": "#40101a", "loopTextColor": "#40101a", "noteBkgColor": "#fff4d6", "noteBorderColor": "#b8860b", "noteTextColor": "#40101a", "activationBkgColor": "#e5c383", "activationBorderColor": "#8a6224", "sequenceNumberColor": "#f8eeda"}}}%%
sequenceDiagram
    autonumber
    participant W as 🧵 Weaver / Co-op
    participant S as ⚙️ SUTRA
    participant L as 📒 Ledger
    participant P as ⛓️ Polygon
    participant B as 🛍️ Buyer

    rect rgb(253, 244, 226)
    Note over W,P: Writing a record — every issue, journey step, seal and claim
    W->>+S: Record an action (e.g. "weaving completed")
    S->>L: entryHash = SHA-256(seq ‖ type ‖ dataHash ‖ prevHash)
    Note right of L: each entry commits to the one before —<br/>edit any past record and the chain breaks
    S-->>-W: ✓ Saved instantly
    S-)P: Anchor entryHash in the background<br/>(platform wallet signs & pays gas)
    P--)S: Transaction hash + block number
    end

    rect rgb(234, 246, 238)
    Note over S,B: Verifying — anyone, any time, no login
    B->>+S: Scan the QR tag
    S->>L: Recompute the whole chain live
    L-->>S: ✓ Intact
    S-->>-B: Verdict + weaver story + Polygonscan links
    B-)P: (optional) check the hash on Polygonscan —<br/>no need to trust SUTRA's servers
    end
```

### 🔎 Click a stage to see the details

<details>
<summary><b>① Onboard & verify — Co-op officer + Verifier</b></summary>

| | |
|---|---|
| **Who** | A cooperative officer registers the weaver; a verifier (co-op officer or Weavers' Service Centre official) visits the loom |
| **What happens** | Identity, loom and craft are checked in person. Government ID numbers are never stored — only a hash |
| **Recorded** | `WEAVER_ATTESTED` — the human attestation that is the root of trust |
| **Can fail?** | Yes — a rejected or later-revoked weaver cannot issue passports, and a revocation shows on every existing passport |
| **In the app** | `/coop/weavers/new` → `/admin/verify` |

</details>

<details>
<summary><b>② Make & passport — Weaver</b></summary>

| | |
|---|---|
| **Who** | The weaver, on a phone — four taps |
| **What happens** | Photo on the loom (compressed on the phone, location metadata stripped), craft, type and a voice note. Yarn, zari and dye lots are linked by grams. Then a Digital Passport is issued: a QR tag plus an 8-character scratch secret |
| **Recorded** | `MATERIAL_REGISTERED`, `PASSPORT_ISSUED`, `TAG_BOUND`, then one `PROVENANCE_EVENT` per journey step |
| **Why it's safe** | Only a hash of the scratch secret is stored — even the database can't reveal it |
| **In the app** | `/w/register` → `/w/products/{id}` · `/w/materials` |

</details>

<details>
<summary><b>③ Seal — Co-op dispatch</b></summary>

| | |
|---|---|
| **Who** | The cooperative, when the piece leaves for a retailer |
| **What happens** | Custody transfers (a piece dispatches exactly once) and the record **freezes** — exactly when the incentive to falsify appears, editing becomes impossible |
| **Recorded** | `PASSPORT_FROZEN` |
| **In the app** | `/coop/products` |

</details>

<details>
<summary><b>④ Scan & claim — Buyer</b></summary>

| | |
|---|---|
| **Who** | Any buyer — no app, no account |
| **What happens** | Scanning shows a verdict (genuine · pending · flagged · voided), the weaver's face and voice, materials and the full journey. The proof page re-checks the whole hash chain live. Claiming with the scratch secret records ownership |
| **Recorded** | `OWNERSHIP_CLAIMED` — scans themselves aren't ledger entries; they feed the risk score |
| **Clone detection** | A second claim on an already-claimed tag triggers a counterfeit alarm |
| **In the app** | `/p/{passportId}` → `/p/{passportId}/claim` · `/purchases` |

</details>

<details>
<summary><b>⑤ Fraud guard — automatic + Admin</b></summary>

| | |
|---|---|
| **Signals** | Duplicate claim (80) · consumer report (35) · repeated failed claims (30) · scan bursts (25) · same tag in 3+ cities within 24 h (20) → a 0–100 risk score |
| **What happens** | High-risk or flagged pieces show a caution on their public page and land in the admin fraud queue, where they are cleared or voided |
| **In the app** | `/report` · `/admin/fraud` |

</details>

▶️ Prefer clicking through it? Try the [interactive walkthrough](https://handloom-gray.vercel.app/how-it-works) — one saree, eight stages, with the screen each person sees.

---

## The problem

A Kanjivaram saree can take 120 hours on a handloom. A power-loom imitation takes 40 minutes —
and to most buyers, the two look the same on a shelf or a product page.

- **Buyers can't tell genuine from fake**, so they either overpay for imitations or stop paying
  a premium altogether.
- **Weavers are invisible.** The person who made the piece has no name, no face and no share of
  the story that sells it.
- **Existing marks are easy to copy.** A printed label or certificate is just paper; it proves
  nothing once it is photocopied or moved to another product.
- **Cooperatives and retailers lack proof** they can hand to a customer, a marketplace or an
  export buyer.

## What SUTRA does

Every genuine piece gets a **Digital Product Passport**: a QR tag linked to a public page that
shows who wove it, where, how, with what materials, and every step it took from yarn to shelf.

| | |
|---|---|
| **Proves origin** | The weaver's identity and loom are verified in person by a cooperative officer or Weavers' Service Centre official. |
| **Tells the story** | The weaver's face, voice note, village and craft travel with the piece — the story that justifies the price. |
| **Stops tampering** | Every event is written to an append-only, hash-chained ledger and anchored on the Polygon blockchain, so no record can be quietly edited later. |
| **Catches clones** | A scratch-panel secret on each tag lets a buyer claim ownership; a second claim on the same tag raises a counterfeit alarm. |

## How it works

1. **The weaver registers the piece** — one photo on the loom, the craft, the type and an
   optional voice note. Four taps on a phone.
2. **A verifier vouches for the weaver** — a human attestation, made at the loom, recorded
   permanently.
3. **A passport is issued** — the piece receives a QR tag and a hidden scratch secret. Journey
   steps (weaving, finishing, quality check, dispatch) are added as they happen. **Dispatch seals
   the record** — exactly when the incentive to falsify appears, the record becomes read-only.
4. **The buyer scans** — no app, no login. In seconds they see a clear verdict, the weaver, the
   materials and the full journey, and can claim the piece as theirs.

> **See it step by step:** the [interactive product journey](https://handloom-gray.vercel.app/how-it-works)
> walks one saree through all eight stages, with the screen each person sees and the ledger entry
> written at each step. Autoplay, click, swipe or use the ← → keys.

## Who it's for

| Stakeholder | Their problem | What SUTRA gives them |
|---|---|---|
| **Buyers** | "Is this really handloom? Who made it?" | A two-second answer on their phone, the maker's story, and proof of ownership they can revisit any time. |
| **Weavers** | Invisible, under-credited, underpaid | A public profile, credit on every piece, and insight into who viewed and scanned their work. |
| **Cooperatives** | No scalable way to prove authenticity | Assisted weaver registration, a verification workflow, custody tracking and customer campaigns. |
| **Retailers & marketplaces** | Counterfeit risk and returns | Sealed custody records, an embeddable "Verified by SUTRA" badge and a public API to show proof on product pages. |
| **Government & GI bodies** | Enforcing Handloom Mark, Silk Mark and GI claims | Certificates attached to each passport, and fraud reports with risk scores in one console. |

## Why buyers can trust it

SUTRA is honest about what technology can and cannot prove. **Technology proves a claim was made
and never altered afterwards; a person proves the claim was true.** SUTRA combines both.

**1. Human verification at the source.**
A verifier physically confirms the weaver's identity and loom. That attestation is the root of
trust. It can expire or be revoked, and a revocation is visible on every passport.

**2. A passport that can't be copied.**
Each QR tag carries a public passport ID plus an 8-character scratch secret. Only a hash of the
secret is stored, so even the database can't reveal it. Claiming ownership needs the physical
tag in hand.

**3. A tamper-evident record.**
Every action (passport issue, journey step, certificate, claim, seal) becomes a ledger entry
whose SHA-256 hash includes the previous entry's hash. Changing any past record breaks the
chain, and the public **proof page** re-checks the whole chain live, in front of the buyer.

**4. Anchored on a public blockchain.**
Each ledger entry's hash is also written to **Polygon** through **Alchemy**. Anyone can click
through from a product's journey to the real transaction on Polygonscan and confirm the hash
matches. No weaver, cooperative or buyer ever handles a wallet, key or gas fee; one platform
account signs and pays for every anchor in the background. Each anchor costs a fraction of a cent.

**5. Active fraud detection.**
A duplicate ownership claim, bursts of scans, the same tag scanned in several cities within a
day, repeated failed claims and consumer reports all feed a 0–100 **risk score** per product. Flagged pieces show a clear caution on their public page and land in an
admin fraud queue for investigation.

## Built for the realities of the field

- **Phone-first.** It installs to the home screen like an app, with a shop-style layout and a
  bottom tab bar. It works on low-end Android phones and iPhones alike.
- **No app or account for buyers.** Scan, browse, verify and look up purchases by phone number.
- **Low-literacy friendly.** Photo-and-tap registration, voice notes instead of typing, and
  big buttons.
- **Light on data.** Photos are compressed on the phone before upload, images are resized per
  device, and pages are cached at the edge.
- **Degrades gracefully.** If the blockchain is slow, the local ledger keeps working and records
  show as "pending" until they're anchored. Buyers are never shown an error in place of a verdict.
- **Privacy by design.** Government ID numbers are never stored (only a hash). Photo metadata,
  including GPS location, is stripped before upload. A weaver's record can be crypto-shredded on
  request.

## Tools for growth

- **Storefront & discovery.** A browsable collection with search, craft and type filters, and
  maker profiles, so authenticity becomes a reason to buy.
- **Weaver insights.** "Who saw my work": scans, reach and pieces that found a home.
- **Cooperative campaigns.** Push-notification campaigns to opted-in customers, such as new
  arrivals, festive collections and restocks, sent straight from the cooperative portal.
- **Embeddable proof.** A live "Verified by SUTRA" SVG badge and a public passport API
  (`/api/v1/passports/{id}`) for marketplaces, brand sites and export buyers.

## Business model *(proposed)*

| Revenue line | Who pays | For what |
|---|---|---|
| **Per-passport fee** | Cooperatives, brands | Issuing a tag and passport for each certified piece |
| **Verification as a service** | Cooperatives, GI & mark bodies | Running and recording in-person weaver verification |
| **Marketplace / API plan** | Retailers, e-commerce platforms | Badge embeds, API access and bulk authenticity checks |
| **Growth tools** | Cooperatives, retailers | Customer campaigns and audience insights |

Buyers never pay to verify. Free, instant verification is what makes the passport valuable to
everyone else.

## What we measure

The platform tracks the numbers that show both trust and impact, and they are visible live on
the home page and admin overview:

- **Verified weavers** and **passports issued**, the supply of provably genuine handloom
- **Consumer scans** and **ownership claims**, i.e. buyer engagement and conversion
- **Fraud reports and clone alarms**, the counterfeit pressure caught
- **Ledger records and on-chain anchors**, the integrity coverage

## Status & roadmap

**Today (pilot):** end-to-end flows for weavers, cooperatives, verifiers, admins and buyers;
live on Vercel with MongoDB Atlas; blockchain anchoring on the Polygon **Amoy testnet**.

**Next:**
- Polygon mainnet anchoring, with gas sponsored through Alchemy Gas Manager
- A production SMS OTP provider (MSG91 / Twilio) for sign-in
- Multilingual voice stories (transcripts and translations)
- Field-level encryption of personal data (MongoDB CSFLE)
- Printed tamper-evident tag partners and cooperative onboarding at scale

## Platform at a glance

| Layer | Technology |
|---|---|
| Web app & API | Next.js 15 (React 19, server rendering and edge caching), hosted on Vercel |
| Data & media | MongoDB Atlas; photos and voice notes in GridFS |
| Integrity | SHA-256 hash-chained ledger, anchored on Polygon via Alchemy (ethers.js) |
| Identity | Phone OTP sign-in; role-based portals for weavers, co-ops, verifiers and admins |
| Engagement | Installable web app (PWA) with web-push campaigns |

---

*Developers: demo logins and tag secrets are generated into `DEMO.md` by `npm run seed`;
blockchain setup is in [`BLOCKCHAIN.md`](BLOCKCHAIN.md).*
