import { initializeVault, generateTestKeypair, getVaultInfo } from "../utils/vaultService.js";
import { getAppWallet, createNewAppWallet, getAppWalletSecretKey, getAppWalletPublicKey } from "../utils/appWallet.js";

/**
 * Initialize a new vault using the specific wallet D7KjNNDwLSeLfZHgkrWfuCEvL15XrWGcjtVSuUpStmWF
 */
export const createVaultWithSpecificWallet = async (req, res) => {
  try {
    const { metadataUri, totalSupply, secretKey } = req.body;

    // Validate required fields
    if (!metadataUri || !totalSupply) {
      return res.status(400).json({
        success: false,
        message: "metadataUri and totalSupply are required",
      });
    }

    if (!secretKey) {
      return res.status(400).json({
        success: false,
        message: "secretKey is required to use the specific wallet D7KjNNDwLSeLfZHgkrWfuCEvL15XrWGcjtVSuUpStmWF",
      });
    }

    // Initialize vault with the specific wallet
    const result = await initializeVault(metadataUri, totalSupply, secretKey);

    res.status(200).json({
      success: true,
      message: "Vault initialized successfully with specific wallet",
      data: result,
    });
  } catch (error) {
    console.error("Create vault with specific wallet error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Initialize a new vault using the application wallet
 */
export const createVault = async (req, res) => {
  try {
    const { metadataUri, totalSupply, payerSecretKey } = req.body;

    // Validate required fields
    if (!metadataUri || !totalSupply) {
      return res.status(400).json({
        success: false,
        message: "metadataUri and totalSupply are required",
      });
    }

    // payerSecretKey is now optional - will use application wallet by default
    const result = await initializeVault(metadataUri, totalSupply, payerSecretKey);

    res.status(200).json({
      success: true,
      message: "Vault initialized successfully with application wallet",
      data: result,
    });
  } catch (error) {
    console.error("Create vault error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Generate a test keypair for development
 */
export const generateKeypair = async (req, res) => {
  try {
    const keypair = generateTestKeypair();

    res.status(200).json({
      success: true,
      message: "Test keypair generated",
      data: keypair,
    });
  } catch (error) {
    console.error("Generate keypair error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get vault information
 */
export const getVault = async (req, res) => {
  try {
    const { vaultAddress } = req.params;

    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        message: "vaultAddress is required",
      });
    }

    const result = await getVaultInfo(vaultAddress);

    res.status(200).json({
      success: true,
      message: "Vault info retrieved successfully",
      data: result.vault,
    });
  } catch (error) {
    console.error("Get vault error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get application wallet information
 */
export const getAppWalletInfo = async (req, res) => {
  try {
    const wallet = getAppWallet();

    res.status(200).json({
      success: true,
      message: "Application wallet info retrieved",
      data: {
        publicKey: wallet.walletData.publicKey,
        secretKey: wallet.walletData.secretKey,
        createdAt: wallet.walletData.createdAt,
        purpose: wallet.walletData.purpose,
      },
    });
  } catch (error) {
    console.error("Get app wallet error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Create a new application wallet
 */
export const createAppWallet = async (req, res) => {
  try {
    const wallet = createNewAppWallet();

    res.status(200).json({
      success: true,
      message: "New application wallet created successfully",
      data: {
        publicKey: wallet.walletData.publicKey,
        secretKey: wallet.walletData.secretKey,
        createdAt: wallet.walletData.createdAt,
        purpose: wallet.walletData.purpose,
      },
    });
  } catch (error) {
    console.error("Create app wallet error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
