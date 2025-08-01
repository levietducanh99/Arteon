import { Keypair } from "@solana/web3.js";
import fs from "fs";
import path from "path";

// File to store the wallet secret key
const WALLET_FILE_PATH = "./backend/config/app-wallet.json";

/**
 * Generate a new wallet for the application
 */
export function generateAppWallet() {
  const keypair = Keypair.generate();

  const walletData = {
    publicKey: keypair.publicKey.toString(),
    secretKey: Array.from(keypair.secretKey),
    createdAt: new Date().toISOString(),
    purpose: "Application wallet for vault operations"
  };

  return {
    keypair,
    walletData
  };
}

/**
 * Save wallet to file system
 */
export function saveWalletToFile(walletData) {
  try {
    // Ensure the config directory exists
    const configDir = path.dirname(WALLET_FILE_PATH);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Save wallet data
    fs.writeFileSync(WALLET_FILE_PATH, JSON.stringify(walletData, null, 2));
    console.log("✅ Wallet saved to:", WALLET_FILE_PATH);
    return true;
  } catch (error) {
    console.error("❌ Error saving wallet:", error);
    return false;
  }
}

/**
 * Load wallet from file system
 */
export function loadWalletFromFile() {
  try {
    if (!fs.existsSync(WALLET_FILE_PATH)) {
      console.log("⚠️ No existing wallet file found");
      return null;
    }

    const walletData = JSON.parse(fs.readFileSync(WALLET_FILE_PATH, "utf8"));
    const keypair = Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));

    return {
      keypair,
      walletData
    };
  } catch (error) {
    console.error("❌ Error loading wallet:", error);
    return null;
  }
}

/**
 * Get or create the application wallet
 */
export function getAppWallet() {
  // Try to load existing wallet
  let wallet = loadWalletFromFile();

  if (!wallet) {
    console.log("🔑 Creating new application wallet...");
    wallet = generateAppWallet();
    saveWalletToFile(wallet.walletData);
  } else {
    console.log("🔑 Loaded existing application wallet:", wallet.walletData.publicKey);
  }

  return wallet;
}

/**
 * Get wallet secret key as array (for API usage)
 */
export function getAppWalletSecretKey() {
  const wallet = getAppWallet();
  return wallet.walletData.secretKey;
}

/**
 * Get wallet public key as string
 */
export function getAppWalletPublicKey() {
  const wallet = getAppWallet();
  return wallet.walletData.publicKey;
}

/**
 * Create a new wallet and replace the existing one
 */
export function createNewAppWallet() {
  console.log("🔄 Creating new application wallet...");
  const wallet = generateAppWallet();
  saveWalletToFile(wallet.walletData);

  console.log("✅ New wallet created!");
  console.log("📍 Public Key:", wallet.walletData.publicKey);
  console.log("🔐 Secret Key:", wallet.walletData.secretKey);

  return wallet;
}
