// Backfill `signup_order` for existing users — assigns sequential numbers
// to all users that don't have one, ordered by creation date.
// Idempotent: only updates users where signup_order is null.
//
// Run: node /app/backend/scripts/backfillSignupOrder.js
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Find current max signup_order to continue from there if some users already have it
  const maxDoc = await User.findOne({ signup_order: { $ne: null } })
    .sort({ signup_order: -1 })
    .select("signup_order")
    .lean();
  let counter = maxDoc?.signup_order || 0;
  console.log(`Starting from signup_order = ${counter + 1}`);

  // Get all users without signup_order, ordered by created_at ASC (oldest first = lowest order)
  const users = await User.find({ $or: [{ signup_order: null }, { signup_order: { $exists: false } }] })
    .sort({ created_at: 1 })
    .select("_id email created_at")
    .lean();
  console.log(`Found ${users.length} users to backfill`);

  for (const u of users) {
    counter += 1;
    await User.updateOne({ _id: u._id }, { $set: { signup_order: counter } });
    console.log(`  #${counter} → ${u.email}`);
  }

  // Final stats
  const total = await User.countDocuments({});
  const founders = await User.countDocuments({ signup_order: { $lte: 100 } });
  const earlyAdopters = await User.countDocuments({
    signup_order: { $gt: 100, $lte: 300 },
  });
  const standard = await User.countDocuments({ signup_order: { $gt: 300 } });
  console.log(`\nDone. Total users: ${total}`);
  console.log(`  Founders (1-100):       ${founders}`);
  console.log(`  Early Adopters (101-300): ${earlyAdopters}`);
  console.log(`  Standard (301+):        ${standard}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
