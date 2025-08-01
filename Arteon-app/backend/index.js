import express from "express";

import userRouter from "./routes/user.route.js";
import pinRouter from "./routes/pin.route.js";
import commnetRouter from "./routes/comment.route.js";
import boardRouter from "./routes/board.route.js";
import vaultRouter from "./routes/vault.route.js";
import connectDB from "./utils/connectDB.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { initializeAuthorityWallet } from "./utils/authorityWallet.js";

const app = express();

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(cookieParser());
app.use(fileUpload());

app.use("/users", userRouter);
app.use("/pins", pinRouter);
app.use("/comments", commnetRouter);
app.use("/boards", boardRouter);
app.use("/vault", vaultRouter);

// Initialize server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Initialize authority wallet with SOL
    console.log("🚀 Initializing server authority wallet...");
    const authorityInfo = await initializeAuthorityWallet();
    console.log("✅ Authority wallet ready:");
    console.log(`   📍 Address: ${authorityInfo.publicKey}`);
    console.log(`   💰 Balance: ${authorityInfo.balance} SOL`);

    // Start server
    app.listen(3000, () => {
      console.log("🌐 Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
