import express from "express";
import { createVault, createVaultWithSpecificWallet, generateKeypair, getVault, getAppWalletInfo, createAppWallet, fractionalizeVaultHandler, getVaultFractionalizationStatus, getAuthorityWalletInfoHandler, ensureAuthorityBalanceHandler, getAllFractionalizations, getFractionalizationByVault, getPinsWithFractionalization } from "../controllers/vault.controller.js";

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

/**
 * POST /vault/fractionalize
 * Fractionalize an existing vault
 * Body: { vaultPubkey: string, authoritySecretKey?: number[] }
 */
router.post("/fractionalize", fractionalizeVaultHandler);

/**
 * GET /vault/:vaultAddress/fractionalization
 * Get detailed vault fractionalization information
 */
router.get("/:vaultAddress/fractionalization", getVaultFractionalizationStatus);

/**
 * GET /vault/authority-wallet
 * Get server authority wallet information (including secret key)
 */
router.get("/authority-wallet", getAuthorityWalletInfoHandler);

/**
 * POST /vault/authority-wallet/ensure-balance
 * Ensure authority wallet has sufficient SOL balance
 * Body: { minBalance?: number }
 */
router.post("/authority-wallet/ensure-balance", ensureAuthorityBalanceHandler);

/**
 * GET /vault/fractionalizations
 * Get all fractionalization records with pagination
 * Query: { page?, limit?, status? }
 */
router.get("/fractionalizations", getAllFractionalizations);

/**
 * GET /vault/pins-with-fractionalization
 * Get pins with fractionalization status
 * Query: { isFractionalized? }
 */
router.get("/pins-with-fractionalization", getPinsWithFractionalization);

/**
 * GET /vault/:vaultAddress/fractionalization-info
 * Get fractionalization record by vault address
 */
router.get("/:vaultAddress/fractionalization-info", getFractionalizationByVault);

export default router;
