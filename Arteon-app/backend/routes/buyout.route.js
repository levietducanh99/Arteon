import express from "express";
import buyoutController from "../controllers/buyout.controller.js";

const router = express.Router();

// POST /buyout/initiate - Create a new buyout offer
router.post("/initiate", buyoutController.initiateBuyout);

// POST /buyout/accept - Accept a buyout offer (mock)
router.post("/accept", buyoutController.acceptBuyout);

// POST /buyout/reject - Reject a buyout offer (mock)
router.post("/reject", buyoutController.rejectBuyout);

// GET /buyout/all-offers - Get all buyout offers across all vaults with filters
router.get("/all-offers", buyoutController.getAllBuyoutOffers);

// GET /buyout/vault/:vaultAddress/offers - Get buyout offers for specific vault from database
router.get("/vault/:vaultAddress/offers", buyoutController.getVaultBuyoutOffers);

// GET /buyout/buyer/:buyerPublicKey/offers - Get buyout offers by buyer
router.get("/buyer/:buyerPublicKey/offers", buyoutController.getBuyerOffers);

// GET /buyout/top-offers - Get top buyout offers by amount
router.get("/top-offers", buyoutController.getTopOffers);

// GET /buyout/statistics - Get buyout statistics
router.get("/statistics", buyoutController.getBuyoutStatistics);

// GET /buyout/offers/:vaultAddress - Get buyout offers for vault (from blockchain - original method)
router.get("/offers/:vaultAddress", buyoutController.getBuyoutOffers);

// Utility endpoints
// GET /buyout/generate-buyer-keypair - Generate a new buyer keypair for testing
router.get("/generate-buyer-keypair", buyoutController.generateBuyerKeypair);

// GET /buyout/generate-buyer-keypair-default - Get default buyer keypair from config
router.get("/generate-buyer-keypair-default", buyoutController.getDefaultBuyerKeypair);

// POST /buyout/airdrop-buyer - Request SOL airdrop for a buyer (localhost only)
router.post("/airdrop-buyer", buyoutController.airdropToBuyer);

export default router;
