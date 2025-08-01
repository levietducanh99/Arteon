import { Schema } from "mongoose";
import mongoose from "mongoose";

const pinSchema = new Schema(
  {
    media: {
      type: String,
      required: true,
    },
    publicKey:{
      type: String,
      required: false
    },
    isFractionalized: {
      type: Boolean,
      default: false,
    },
    fractionalizationData: {
      tokenMintAddress: {
        type: String,
        required: false,
      },
      tokenBalance: {
        type: String,
        required: false,
      },
      fractionalizedAt: {
        type: Date,
        required: false,
      },
      transactionSignature: {
        type: String,
        required: false,
      },
    },
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    link: {
      type: String,
    },
    board: { type: Schema.Types.ObjectId, ref: "Board" },
    tags: {
      type: [String],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Pin", pinSchema);
