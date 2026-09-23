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
| Kanjivaram Silk Saree — Peacock Blue with Temple Border | y4jHWgKVZBqqhNvF | 6FRZYZBD | ALREADY CLAIMED — claiming again triggers the clone alarm (409) |
| Kanjivaram Silk Saree — Maroon with Gold Checks | 3SaaX9FTCrBaPVzo | WVYFX7XA | at retailer, unclaimed — try the claim flow |
| Pochampally Ikat Silk Saree — Indigo Diamond Grid | 2iJ7FePQR8cnn9Xr | VY2H5SUV | at retailer, unclaimed — try the claim flow |
| Ikat Cotton Dupatta — Rust Chevron | 2v1Cn3tizLvd3zXV | 29RKD4TN | with weaver |
| Banarasi Katan Silk Saree — Ivory Kadhua Butis | W4BEA7Mmd4tP7f37 | WE8WMGB7 | at retailer, unclaimed — try the claim flow |
| Banarasi Silk Stole — Midnight Konia | 8gXDTkGzRxNN9ByR | ZNKMCT79 | with weaver |

Clone-alarm demo: open /p/y4jHWgKVZBqqhNvF/claim and enter secret 6FRZYZBD — it is already claimed, so you get the 409 counterfeit alert and a fraud report appears in /admin/fraud.