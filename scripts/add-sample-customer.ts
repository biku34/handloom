/**
 * Adds a sample CUSTOMER (consumer) to the current database so the public
 * "My purchases" page has something to show and the notification opt-in has a
 * real person behind it.
 *
 * Idempotent — safe to run repeatedly and after a re-seed. It:
 *   1. Upserts a CONSUMER user (phone 9000000005, "Ananya Reddy").
 *   2. Puts that phone on the already-claimed hero saree's claim.
 *   3. Adds two more "owned" pieces (display claims) so the collection isn't
 *      a single item — using pieces that aren't part of any interactive demo,
 *      so the claim-flow / clone-alarm demos stay intact.
 *
 * Run:  npx tsx scripts/add-sample-customer.ts
 *       (MONGODB_URI is read from the environment / .env.local, same as the app)
 */
import { dbConnect } from "../lib/db";
import { User, Claim, Product } from "../lib/models";
import mongoose from "mongoose";

const PHONE = "9000000005";
const NAME = "Ananya Reddy";
const EMAIL = "ananya.reddy@example.com";

// Hero saree = already claimed in the seed → just attach the phone to it.
const HERO_PASSPORT = "5iVUcX88DvW7F4iB";
// Two "with weaver" pieces (no interactive demo depends on them) → mark owned.
const EXTRA_PASSPORTS = ["3XLK3M8S4Vm37LiA", "2sD8LTFCmnzCNuZc"];

const daysAgo = (n: number) => new Date(Date.now() - n * 86400_000);

async function main() {
  await dbConnect();

  // 1) the customer account
  await User.updateOne(
    { phone: PHONE },
    { $set: { phone: PHONE, name: NAME, email: EMAIL, role: "CONSUMER", locale: "en", status: "ACTIVE" } },
    { upsert: true }
  );
  console.log(`✓ customer user ${NAME} (${PHONE})`);

  // 2) hero saree — attach the phone to the existing claim
  const hero = await Product.findOne({ passportId: HERO_PASSPORT }).lean<{ _id: unknown; item?: { name?: string } }>();
  if (hero) {
    const r = await Claim.updateOne(
      { productId: hero._id },
      { $set: { claimantPhone: PHONE, claimantName: NAME, claimantEmail: EMAIL, status: "CLAIMED" } }
    );
    if (r.matchedCount === 0) {
      await Claim.create({
        productId: hero._id, passportId: HERO_PASSPORT, claimantName: NAME, claimantPhone: PHONE, claimantEmail: EMAIL,
        method: "SCRATCH_SECRET", status: "CLAIMED", claimedAt: daysAgo(10),
      });
    }
    console.log(`✓ owns "${hero.item?.name}" (${HERO_PASSPORT})`);
  } else {
    console.warn(`! hero product ${HERO_PASSPORT} not found — run "npm run seed" first`);
  }

  // 3) two extra owned pieces (display claims)
  for (const pid of EXTRA_PASSPORTS) {
    const p = await Product.findOne({ passportId: pid }).lean<{ _id: unknown; item?: { name?: string } }>();
    if (!p) {
      console.warn(`! product ${pid} not found — skipped`);
      continue;
    }
    await Claim.updateOne(
      { productId: p._id, claimantPhone: PHONE },
      {
        $set: {
          productId: p._id, passportId: pid, claimantName: NAME, claimantPhone: PHONE, claimantEmail: EMAIL,
          method: "SCRATCH_SECRET", status: "CLAIMED", claimedAt: daysAgo(5),
        },
      },
      { upsert: true }
    );
    await Product.updateOne(
      { _id: p._id },
      { $set: { "authenticity.claimedByConsumer": true, "authenticity.claimedAt": daysAgo(5), "custody.currentHolderType": "CONSUMER", "custody.currentHolderName": NAME } }
    );
    console.log(`✓ owns "${p.item?.name}" (${pid})`);
  }

  console.log(`\nDone. Open /purchases and enter ${PHONE} to see the collection.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
