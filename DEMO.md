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
| Customer — Ananya Reddy (no login; use in /purchases) | 9000000005 | /purchases |

Sample customer: open **/purchases**, enter **9000000005**, and you'll see 3 owned pieces plus the "Turn on updates" notification opt-in — the audience for a co-op campaign. Re-create it after any re-seed with `npm run seed:customer`.

## Passports & scratch-panel secrets

| Product | Passport (URL: /p/{id}) | Secret | Note |
|---|---|---|---|
| Kanjivaram Silk Saree — Peacock Blue with Temple Border | 5iVUcX88DvW7F4iB | 9PN7R39J | ALREADY CLAIMED — claiming again triggers the clone alarm (409) |
| Kanjivaram Silk Saree — Maroon with Gold Checks | 2moThKcYACZWn4vb | QHKMQA44 | at retailer, unclaimed — try the claim flow |
| Pochampally Ikat Silk Saree — Indigo Diamond Grid | 3fbY2odoFhGHMvdm | R65SK82E | at retailer, unclaimed — try the claim flow |
| Ikat Cotton Dupatta — Rust Chevron | 3XLK3M8S4Vm37LiA | TX6DEEXW | with weaver |
| Banarasi Katan Silk Saree — Ivory Kadhua Butis | 2gY2YPYYKdEWGLqg | M67DCXV7 | at retailer, unclaimed — try the claim flow |
| Banarasi Silk Stole — Midnight Konia | 2sD8LTFCmnzCNuZc | W4VHNEHS | with weaver |

Clone-alarm demo: open /p/5iVUcX88DvW7F4iB/claim and enter secret 9PN7R39J — it is already claimed, so you get the 409 counterfeit alert and a fraud report appears in /admin/fraud.