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
    price: {
      type: Number,
      required: false,
      min: 0,
      default: null,
      // Giá tính bằng SOL, có thể null nếu không có giá
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
