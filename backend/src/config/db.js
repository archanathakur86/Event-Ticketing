import mongoose from "mongoose";
import dns from "node:dns";

export const connectDB = async () => {
  // Avoid long buffering waits when DB is unavailable
  mongoose.set("bufferCommands", false);

  const candidates = [
    process.env.MONGODB_URI,
    process.env.DATABASE_URL,
    process.env.DATABASE,
    process.env.MONGO_URL,
  ]
    .filter(Boolean)
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (candidates.length === 0) {
    console.error("MongoDB Connection Error: No MongoDB URI configured in environment");
    return null;
  }

  const isLocalMongoUri = (uri) => {
    const v = String(uri || "").toLowerCase();
    return v.includes("127.0.0.1") || v.includes("localhost");
  };

  const hasRemoteCandidate = candidates.some((u) => !isLocalMongoUri(u));
  const allowLocalFallback = String(process.env.ALLOW_LOCAL_MONGO_FALLBACK || "").toLowerCase() === "true";

  const orderedCandidates = [...new Set(candidates)].filter((uri) => {
    if (!hasRemoteCandidate) return true;
    if (!isLocalMongoUri(uri)) return true;
    return allowLocalFallback;
  });

  if (hasRemoteCandidate && !allowLocalFallback) {
    console.warn("Local Mongo fallback is disabled while remote Mongo URI is configured. Set ALLOW_LOCAL_MONGO_FALLBACK=true to enable localhost fallback.");
  }

  for (const uri of orderedCandidates) {
    try {
      // Prefer stable public DNS resolvers for Atlas SRV lookups.
      if (String(uri).startsWith("mongodb+srv://")) {
        try {
          dns.setServers(["8.8.8.8", "1.1.1.1"]);
        } catch (e) {
          // Ignore DNS override failures and continue with system defaults.
        }
      }

      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 7000,
        family: 4,
      });
      console.log("MongoDB Connected:", conn.connection.host);
      return conn;
    } catch (error) {
      const message = error?.message || String(error);
      console.error("MongoDB Connection Error:", message);
      if (message.includes("querySrv ESERVFAIL") || message.includes("ENOTFOUND")) {
        console.warn("MongoDB DNS/SRV lookup failed for URI. Trying next configured URI if available...");
      }
    }
  }

  console.warn("Continuing without DB connection — server will start but DB operations will fail until a connection is available.");
  return null;
};
