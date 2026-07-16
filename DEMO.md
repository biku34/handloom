# SUTRA — Demo credentials & tag secrets (LOCAL DEV ONLY)

OTP login: enter the phone number, the OTP is shown on screen (dev mode).

| Role | Phone | Portal |
|---|---|---|
| Admin | 9000000001 | /admin/dashboard |
| Co-op officer | 9000000002 | /coop/dashboard |
| Verifier (WSC) | 9000000003 | /admin/verify |
| Retailer | 9000000004 | /coop/dashboard |
| Weaver — Murugan S. | 9111111111 | /w/dashboard |
| Weaver — Lakshmi Devi | 9222222222 | /w/dashboard |
| Weaver — Abdul Rahman | 9333333333 | /w/dashboard |
| Weaver — Selvi A. (PENDING — verify her in /admin/verify) | 9444444444 | /w/dashboard |

## Passports & scratch-panel secrets

| Product | Passport (URL: /p/{id}) | Secret | Note |
|---|---|---|---|
| Kanjivaram Silk Saree — Peacock Blue with Temple Border | 3SinDRAhbyfzhSG7 | U4GAPXG7 | ALREADY CLAIMED — claiming again triggers the clone alarm (409) |
| Kanjivaram Silk Saree — Maroon with Gold Checks | 4r1qAdeLkpzYSHHG | S6FE8K85 | at retailer, unclaimed — try the claim flow |
| Pochampally Ikat Silk Saree — Indigo Diamond Grid | 13DdBDSB2yNSx3sv | AD2DX52S | at retailer, unclaimed — try the claim flow |
| Ikat Cotton Dupatta — Rust Chevron | 5e99F146sev2b6vQ | TBUCYJ7D | with weaver |
| Banarasi Katan Silk Saree — Ivory Kadhua Butis | uPak7Z23PKiJHpLr | 7UN9SZKR | at retailer, unclaimed — try the claim flow |
| Banarasi Silk Stole — Midnight Konia | 5J3UyHrWSVBM1sPJ | Z6CJNBXU | with weaver |

Clone-alarm demo: open /p/3SinDRAhbyfzhSG7/claim and enter secret U4GAPXG7 — it is already claimed, so you get the 409 counterfeit alert and a fraud report appears in /admin/fraud.