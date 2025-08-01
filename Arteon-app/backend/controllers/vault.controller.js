import { initializeVault, generateTestKeypair, getVaultInfo } from "../utils/vaultService.js";
import { fractionalizeVault, getVaultFractionalizationInfo } from "../utils/fractionalizeVaultService.js";
import { getAuthorityWallet, getAuthorityPublicKey, getAuthorityWalletInfo, ensureAuthorityBalance } from "../utils/authorityWallet.js";
import { Connection, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import Fractionalization from "../models/fractionalization.models.js";
import Pin from "../models/pin.models.js";

const LOCAL_CONNECTION = new Connection("http://localhost:8899", "confirmed");

/**
 * Initialize a new vault with fixed server authority
 */
export const createVault = async (req, res) => {
  try {
    const { metadataUri, totalSupply } = req.body;

    // Validate required fields
    if (!metadataUri || !totalSupply) {
      return res.status(400).json({
        success: false,
        message: "metadataUri and totalSupply are required",
      });
    }

    // Initialize vault with fixed server authority (no need for secretKey parameter)
    const result = await initializeVault(metadataUri, totalSupply);

    res.status(200).json({
      success: true,
      message: "Vault initialized successfully with fixed server authority",
      data: {
        ...result,
        serverAuthority: getAuthorityPublicKey(),
      },
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
 * Legacy method - redirects to new createVault method
 */
export const createVaultWithSpecificWallet = async (req, res) => {
  try {
    console.log("⚠️ Using legacy endpoint - redirecting to fixed server authority");

    const { metadataUri, totalSupply } = req.body;

    // Validate required fields
    if (!metadataUri || !totalSupply) {
      return res.status(400).json({
        success: false,
        message: "metadataUri and totalSupply are required",
      });
    }

    // Initialize vault with fixed server authority (ignore secretKey parameter)
    const result = await initializeVault(metadataUri, totalSupply);

    res.status(200).json({
      success: true,
      message: "Vault initialized successfully with fixed server authority (legacy endpoint)",
      data: {
        ...result,
        serverAuthority: getAuthorityPublicKey(),
        note: "This endpoint now uses fixed server authority instead of provided secretKey",
      },
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

/**
 * Fractionalize an existing vault using centralized authority system
 * POST /vault/fractionalize
 * Body: { vaultPubkey: string, useServerAuthority?: boolean }
 */
export const fractionalizeVaultHandler = async (req, res) => {
  try {
    const { vaultPubkey, useServerAuthority = true } = req.body;

    // Validate required fields
    if (!vaultPubkey) {
      return res.status(400).json({
        success: false,
        message: "vaultPubkey is required"
      });
    }

    console.log("🔧 Fractionalize vault request received:");
    console.log("📝 Vault PublicKey:", vaultPubkey);
    console.log("🔑 Use Server Authority:", useServerAuthority);

    // Đầu tiên kiểm tra thông tin vault để xem ai là authority
    console.log("🔍 Checking vault authority...");
    try {
      const vaultInfo = await getVaultInfo(vaultPubkey);
      console.log("📊 Vault authority:", vaultInfo.vault.authority);

      // Lấy server authority để so sánh
      const serverAuthorityInfo = getAuthorityWalletInfo();
      console.log("🏛️ Server authority:", serverAuthorityInfo.publicKey);

      // Kiểm tra xem server authority có khớp với vault authority không
      if (vaultInfo.vault.authority !== serverAuthorityInfo.publicKey) {
        console.log("⚠️ Server authority does not match vault authority");
        console.log("💡 Need to use the original vault creator's authority");

        // Thông báo cho user cần cung cấp authority key
        return res.status(403).json({
          success: false,
          error: "AUTHORITY_MISMATCH",
          message: "Server authority does not match vault authority. Vault can only be fractionalized by its creator.",
          data: {
            vaultAuthority: vaultInfo.vault.authority,
            serverAuthority: serverAuthorityInfo.publicKey,
            suggestion: "Please provide the correct authority secret key or contact the vault creator"
          }
        });
      }

      console.log("✅ Server authority matches vault authority");

    } catch (vaultCheckError) {
      console.error("❌ Failed to check vault info:", vaultCheckError);
      return res.status(500).json({
        success: false,
        error: "VAULT_CHECK_FAILED",
        message: "Could not verify vault authority: " + vaultCheckError.message
      });
    }

    let authoritySecretKey = null;

    if (useServerAuthority) {
      console.log("🔑 Using server authority wallet...");
      try {
        // Ensure authority wallet has sufficient balance
        await ensureAuthorityBalance(1); // Ensure at least 1 SOL
        // Pass null to use server authority wallet
        authoritySecretKey = null;
        console.log("✅ Server authority wallet ready");
      } catch (error) {
        console.error("❌ Failed to prepare authority wallet:", error);
        return res.status(500).json({
          success: false,
          error: "AUTHORITY_WALLET_ERROR",
          message: "Server authority wallet not available"
        });
      }
    }

    // Call fractionalization service
    const result = await fractionalizeVault(vaultPubkey, authoritySecretKey, true);

    console.log("✅ Vault fractionalized successfully!");

    return res.status(200).json({
      success: true,
      message: "Vault fractionalized successfully",
      data: result
    });

  } catch (error) {
    console.error("❌ Fractionalize vault error:", error.message);

    // Handle specific error cases
    if (error.message.includes("already been fractionalized")) {
      return res.status(400).json({
        success: false,
        error: "VAULT_ALREADY_FRACTIONALIZED",
        message: "This vault has already been fractionalized"
      });
    }

    if (error.message.includes("Unauthorized")) {
      return res.status(403).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Only the vault authority can fractionalize this vault. The server authority does not match the vault creator."
      });
    }

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "VAULT_NOT_FOUND",
        message: "Vault not found with the provided public key"
      });
    }

    if (error.message.includes("Invalid vault public key")) {
      return res.status(400).json({
        success: false,
        error: "INVALID_PUBLIC_KEY",
        message: "Invalid vault public key format"
      });
    }

    return res.status(500).json({
      success: false,
      error: "FRACTIONALIZATION_FAILED",
      message: error.message
    });
  }
};

/**
 * Get server authority wallet information
 * GET /vault/authority-wallet
 */
export const getAuthorityWalletInfoHandler = async (req, res) => {
  try {
    const walletInfo = getAuthorityWalletInfo();

    // Also get current balance
    const balance = await LOCAL_CONNECTION.getBalance(new PublicKey(walletInfo.publicKey));

    return res.status(200).json({
      success: true,
      message: "Authority wallet info retrieved",
      data: {
        publicKey: walletInfo.publicKey,
        secretKey: walletInfo.secretKey, // Full secret key array
        balanceSOL: balance / anchor.web3.LAMPORTS_PER_SOL,
        balanceLamports: balance,
        purpose: "Server Authority Wallet for Vault Operations"
      }
    });

  } catch (error) {
    console.error("❌ Get authority wallet error:", error);
    return res.status(500).json({
      success: false,
      error: "AUTHORITY_WALLET_ERROR",
      message: error.message
    });
  }
};

/**
 * Ensure authority wallet has sufficient balance
 * POST /vault/authority-wallet/ensure-balance
 * Body: { minBalance?: number }
 */
export const ensureAuthorityBalanceHandler = async (req, res) => {
  try {
    const { minBalance = 5 } = req.body;

    console.log(`🔧 Ensuring authority wallet has at least ${minBalance} SOL...`);

    const balance = await ensureAuthorityBalance(minBalance);
    const balanceSOL = balance / anchor.web3.LAMPORTS_PER_SOL;

    return res.status(200).json({
      success: true,
      message: `Authority wallet balance ensured (${balanceSOL} SOL)`,
      data: {
        balanceSOL,
        balanceLamports: balance,
        minBalanceRequired: minBalance
      }
    });

  } catch (error) {
    console.error("❌ Ensure balance error:", error);
    return res.status(500).json({
      success: false,
      error: "BALANCE_ENSURE_FAILED",
      message: error.message
    });
  }
};

/**
 * Get detailed vault information including fractionalization status
 * GET /vault/:vaultAddress/fractionalization
 */
export const getVaultFractionalizationStatus = async (req, res) => {
  try {
    const { vaultAddress } = req.params;

    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        message: "Vault address is required"
      });
    }

    console.log("🔍 Getting fractionalization info for vault:", vaultAddress);

    const result = await getVaultFractionalizationInfo(vaultAddress);

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("❌ Get fractionalization info error:", error.message);

    if (error.message.includes("not found")) {
      return res.status(404).json({
        success: false,
        error: "VAULT_NOT_FOUND",
        message: "Vault not found with the provided address"
      });
    }

    return res.status(500).json({
      success: false,
      error: "FETCH_FAILED",
      message: error.message
    });
  }
};

/**
 * Get all fractionalization records
 * GET /vault/fractionalizations
 */
export const getAllFractionalizations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'active' } = req.query;

    const fractionalizations = await Fractionalization.find({ status })
      .populate('pinId', 'title media publicKey')
      .sort({ fractionalizedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Fractionalization.countDocuments({ status });

    return res.status(200).json({
      success: true,
      data: {
        fractionalizations,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page * limit < total,
        }
      }
    });

  } catch (error) {
    console.error("❌ Get fractionalizations error:", error);
    return res.status(500).json({
      success: false,
      error: "FETCH_FAILED",
      message: error.message
    });
  }
};

/**
 * Get fractionalization by vault address
 * GET /vault/:vaultAddress/fractionalization-info
 */
export const getFractionalizationByVault = async (req, res) => {
  try {
    const { vaultAddress } = req.params;

    const fractionalization = await Fractionalization.findOne({
      vaultPublicKey: vaultAddress
    }).populate('pinId', 'title media publicKey');

    if (!fractionalization) {
      return res.status(404).json({
        success: false,
        error: "NOT_FOUND",
        message: "Fractionalization record not found for this vault"
      });
    }

    return res.status(200).json({
      success: true,
      data: fractionalization
    });

  } catch (error) {
    console.error("❌ Get fractionalization by vault error:", error);
    return res.status(500).json({
      success: false,
      error: "FETCH_FAILED",
      message: error.message
    });
  }
};

/**
 * Get pins with fractionalization status
 * GET /vault/pins-with-fractionalization
 */
export const getPinsWithFractionalization = async (req, res) => {
  try {
    const { isFractionalized } = req.query;

    let filter = {};
    if (isFractionalized !== undefined) {
      filter.isFractionalized = isFractionalized === 'true';
    }

    const pins = await Pin.find(filter)
      .populate('user', 'username displayName')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: pins
    });

  } catch (error) {
    console.error("❌ Get pins with fractionalization error:", error);
    return res.status(500).json({
      success: false,
      error: "FETCH_FAILED",
      message: error.message
    });
  }
};
