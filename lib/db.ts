import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null } | undefined;
}

const cached = global._mongoose ?? (global._mongoose = { conn: null, promise: null });

export async function dbConnect() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    // Read the URI lazily (not at import time) so scripts that populate
    // process.env before calling dbConnect() target the right database.
    const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sutra";
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      // Serverless-friendly: a small pool per instance, and fail fast (5s)
      // instead of hanging a page for 30s when Atlas is unreachable.
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
  return cached.conn;
}
