import mongoose from "mongoose";

const buyoutOfferSchema = new mongoose.Schema(
  {
    // Blockchain info
    vaultAddress: {
      type: String,
      required: true,
      trim: true,
    },
    buyerPublicKey: {
      type: String,
      required: true,
      trim: true,
    },
    buyoutOfferPDA: {
      type: String,
      required: true,
      unique: true, // Mỗi PDA chỉ có một record
      trim: true,
    },

    // Offer details
    offerAmount: {
      type: String, // Store as string to handle large numbers
      required: true,
    },
    offerAmountSOL: {
      type: Number, // For easier querying/sorting
      required: true,
    },

    // Transaction info
    transactionSignature: {
      type: String,
      required: true,
      trim: true,
    },
    network: {
      type: String,
      default: "localhost",
      enum: ["localhost", "devnet", "testnet", "mainnet"],
    },

    // Status tracking
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "accepted", "rejected", "expired", "cancelled"],
    },

    // Timestamps
    offerTimestamp: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Default expiry: 7 days from creation
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }
    },

    // Related data
    vaultInfo: {
      authority: String,
      metadataUri: String,
      totalSupply: String,
      tokenMint: String,
    },

    // Response tracking
    respondedAt: Date,
    respondedBy: String, // Authority who accepted/rejected
    responseTransactionSignature: String,

    // Additional metadata
    notes: String,
    buyerNote: String, // Note from buyer when creating offer
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
buyoutOfferSchema.index({ vaultAddress: 1, status: 1 });
buyoutOfferSchema.index({ buyerPublicKey: 1 });
buyoutOfferSchema.index({ status: 1, createdAt: -1 });
buyoutOfferSchema.index({ offerAmountSOL: -1 }); // For sorting by offer amount
buyoutOfferSchema.index({ expiresAt: 1 }); // For cleanup of expired offers

// Virtual for checking if offer is expired
buyoutOfferSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Virtual for offer amount in different units
buyoutOfferSchema.virtual('offerAmountLamports').get(function() {
  return this.offerAmount;
});

// Static method to get active offers for a vault
buyoutOfferSchema.statics.getActiveOffersForVault = function(vaultAddress) {
  return this.find({
    vaultAddress,
    status: 'pending',
    expiresAt: { $gt: new Date() }
  }).sort({ offerAmountSOL: -1, createdAt: -1 });
};

// Static method to get all offers for a buyer
buyoutOfferSchema.statics.getOffersByBuyer = function(buyerPublicKey) {
  return this.find({ buyerPublicKey })
    .sort({ createdAt: -1 });
};

// Static method to get top offers across all vaults
buyoutOfferSchema.statics.getTopOffers = function(limit = 10) {
  return this.find({
    status: 'pending',
    expiresAt: { $gt: new Date() }
  })
  .sort({ offerAmountSOL: -1, createdAt: -1 })
  .limit(limit);
};

// Instance method to mark as expired
buyoutOfferSchema.methods.markAsExpired = function() {
  this.status = 'expired';
  return this.save();
};

// Instance method to accept offer
buyoutOfferSchema.methods.accept = function(respondedBy, transactionSignature) {
  this.status = 'accepted';
  this.respondedAt = new Date();
  this.respondedBy = respondedBy;
  this.responseTransactionSignature = transactionSignature;
  return this.save();
};

// Instance method to reject offer
buyoutOfferSchema.methods.reject = function(respondedBy, reason) {
  this.status = 'rejected';
  this.respondedAt = new Date();
  this.respondedBy = respondedBy;
  this.notes = reason;
  return this.save();
};

const BuyoutOffer = mongoose.model("BuyoutOffer", buyoutOfferSchema);

export default BuyoutOffer;
