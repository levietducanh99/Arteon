import express, { json } from "express";

import userRouter from "./routes/user.route.js";
import pinRouter from "./routes/pin.route.js";
import commnetRouter from "./routes/comment.route.js";
import boardRouter from "./routes/board.route.js";
import vaultRouter from "./routes/vault.route.js";
import buyoutRouter from "./routes/buyout.route.js";
import connectDB from "./utils/connectDB.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

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
app.use("/buyout", buyoutRouter);

app.listen(3000, () => {
  connectDB();
  console.log("sever is running");
});
