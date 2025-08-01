import express from "express";
import { createVault, createVaultWithSpecificWallet, generateKeypair, getVault, getAppWalletInfo, createAppWallet } from "../controllers/vault.controller.js";

const router = express.Router();

/**
 * POST /vault/initialize
 * Initialize a new vault on Solana (generates test wallet automatically)
 * Body: { metadataUri: string, totalSupply: number, payerSecretKey?: number[] }
 */
router.post("/initialize", createVault);

/**
 * POST /vault/initialize-with-specific-wallet
 * Initialize a new vault using the specific wallet D7KjNNDwLSeLfZHgkrWfuCEvL15XrWGcjtVSuUpStmWF
 * Body: { metadataUri: string, totalSupply: number, secretKey: number[] }
 */
router.post("/initialize-with-specific-wallet", createVaultWithSpecificWallet);

/**
 * GET /vault/generate-keypair
 * Generate a test keypair for development
 */
router.get("/generate-keypair", generateKeypair);

/**
 * GET /vault/:vaultAddress
 * Get vault information by address
 */
router.get("/:vaultAddress", getVault);

/**
 * GET /vault/app-wallet
 * Get application wallet information (including secret key)
 */
router.get("/app-wallet", getAppWalletInfo);

/**
 * POST /vault/app-wallet/create
 * Create a new application wallet
 */
router.post("/app-wallet/create", createAppWallet);

export default router;
