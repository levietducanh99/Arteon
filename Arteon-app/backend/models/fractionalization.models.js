import { Schema } from "mongoose";
import mongoose from "mongoose";

const fractionalizationSchema = new Schema(
  {
    vaultPublicKey: {
      type: String,
      required: true,
      unique: true,
    },
    pinId: {
      type: Schema.Types.ObjectId,
      ref: "Pin",
      required: false, // Có thể có vault không liên kết với pin
    },
    tokenMintAddress: {
      type: String,
      required: true,
    },
    authorityAddress: {
      type: String,
      required: true,
    },
    authorityTokenAccount: {
      type: String,
      required: true,
    },
    totalSupply: {
      type: String, // Lưu dưới dạng string vì số lớn
      required: true,
    },
    tokenBalance: {
      type: String, // Balance trong authority token account
      required: true,
    },
    transactionSignature: {
      type: String,
      required: true,
    },
    fractionalizedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: String, // Metadata URI gốc của vault
      required: false,
    },
    network: {
      type: String,
      default: "localhost",
    },
    status: {
      type: String,
      enum: ["active", "burned", "redeemed"],
      default: "active",
    },
  },
  { timestamps: true }
);

// Index để tìm kiếm nhanh
fractionalizationSchema.index({ vaultPublicKey: 1 });
fractionalizationSchema.index({ pinId: 1 });
fractionalizationSchema.index({ tokenMintAddress: 1 });

export default mongoose.model("Fractionalization", fractionalizationSchema);
