import { Keypair, Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

const LOCAL_CONNECTION = new Connection("http://localhost:8899", "confirmed");
const AUTHORITY_WALLET_PATH = "./backend/data/authority-wallet.json";

let authorityWallet = null;

/**
 * Load authority wallet từ file JSON
 */
function loadAuthorityWalletFromFile() {
  try {
    const walletPath = path.resolve(process.cwd(), AUTHORITY_WALLET_PATH);

    if (!fs.existsSync(walletPath)) {
      throw new Error(`Authority wallet file not found at: ${walletPath}`);
    }

    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));

    // Tạo keypair từ secret key trong file
    const keypair = Keypair.fromSecretKey(new Uint8Array(walletData.secretKey));

    console.log("✅ Loaded fixed server authority wallet:");
    console.log("📍 Public Key:", keypair.publicKey.toString());
    console.log("🔒 Is Fixed:", walletData.isFixed);

    return keypair;
  } catch (error) {
    console.error("❌ Error loading authority wallet:", error.message);
    throw error;
  }
}

/**
 * Get authority wallet (load once, reuse)
 */
export function getAuthorityWallet() {
  if (!authorityWallet) {
    authorityWallet = loadAuthorityWalletFromFile();
  }
  return authorityWallet;
}

/**
 * Initialize authority wallet và kiểm tra balance
 */
export async function initializeAuthorityWallet() {
  try {
    console.log("🔑 Initializing fixed server authority wallet...");

    // Load authority wallet
    const wallet = getAuthorityWallet();
    console.log("📍 Authority loaded:", wallet.publicKey.toString());

    // Check balance trên local network
    const balance = await LOCAL_CONNECTION.getBalance(wallet.publicKey);
    console.log(`💰 Authority balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    // Airdrop nếu balance thấp
    if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("💧 Authority needs SOL, requesting airdrop...");
      try {
        const airdropSignature = await LOCAL_CONNECTION.requestAirdrop(
          wallet.publicKey,
          10 * anchor.web3.LAMPORTS_PER_SOL
        );
        await LOCAL_CONNECTION.confirmTransaction(airdropSignature, "confirmed");
        console.log("✅ Authority airdrop completed!");

        // Wait for balance to update
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newBalance = await LOCAL_CONNECTION.getBalance(wallet.publicKey);
        console.log(`💰 New authority balance: ${newBalance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      } catch (airdropError) {
        console.log("❌ Authority airdrop failed:", airdropError.message);
        // Continue anyway, might still work
      }
    }

    return {
      success: true,
      publicKey: wallet.publicKey.toString(),
      balance: balance / anchor.web3.LAMPORTS_PER_SOL,
      isFixed: true
    };
  } catch (error) {
    console.error("❌ Error initializing authority wallet:", error);
    throw new Error(`Failed to initialize authority wallet: ${error.message}`);
  }
}

/**
 * Get authority public key as string
 */
export function getAuthorityPublicKey() {
  const wallet = getAuthorityWallet();
  return wallet.publicKey.toString();
}

/**
 * Get authority wallet info (for controller use)
 */
export function getAuthorityWalletInfo() {
  try {
    const wallet = getAuthorityWallet();

    // Load wallet data from file to get additional info
    const walletPath = path.resolve(process.cwd(), AUTHORITY_WALLET_PATH);
    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf8"));

    return {
      publicKey: wallet.publicKey.toString(),
      secretKey: walletData.secretKey,
      createdAt: walletData.createdAt,
      purpose: walletData.purpose,
      isFixed: walletData.isFixed
    };
  } catch (error) {
    throw new Error(`Failed to get authority wallet info: ${error.message}`);
  }
}

/**
 * Ensure authority wallet has sufficient balance for operations
 */
export async function ensureAuthorityBalance(minBalanceSOL = 1) {
  try {
    const wallet = getAuthorityWallet();
    const currentBalance = await LOCAL_CONNECTION.getBalance(wallet.publicKey);
    const currentBalanceSOL = currentBalance / anchor.web3.LAMPORTS_PER_SOL;

    console.log(`💰 Current authority balance: ${currentBalanceSOL} SOL`);
    console.log(`🎯 Required minimum balance: ${minBalanceSOL} SOL`);

    const requiredBalance = minBalanceSOL * anchor.web3.LAMPORTS_PER_SOL;

    if (currentBalance >= requiredBalance) {
      console.log("✅ Authority balance is sufficient");
      return currentBalance;
    }

    // Need to airdrop
    const airdropAmount = Math.max(
      requiredBalance - currentBalance,
      2 * anchor.web3.LAMPORTS_PER_SOL // Airdrop at least 2 SOL
    );

    console.log(`💧 Requesting airdrop of ${airdropAmount / anchor.web3.LAMPORTS_PER_SOL} SOL...`);

    try {
      const airdropSignature = await LOCAL_CONNECTION.requestAirdrop(
        wallet.publicKey,
        airdropAmount
      );

      await LOCAL_CONNECTION.confirmTransaction(airdropSignature, "confirmed");
      console.log("✅ Airdrop completed!");

      // Wait for balance to update
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newBalance = await LOCAL_CONNECTION.getBalance(wallet.publicKey);
      const newBalanceSOL = newBalance / anchor.web3.LAMPORTS_PER_SOL;
      console.log(`💰 New authority balance: ${newBalanceSOL} SOL`);

      return newBalance;
    } catch (airdropError) {
      console.error("❌ Airdrop failed:", airdropError.message);
      throw new Error(`Failed to ensure sufficient balance. Current: ${currentBalanceSOL} SOL, Required: ${minBalanceSOL} SOL. Airdrop failed: ${airdropError.message}`);
    }
  } catch (error) {
    console.error("❌ Error ensuring authority balance:", error);
    throw new Error(`Failed to ensure authority balance: ${error.message}`);
  }
}

/**
 * Check if authority is properly initialized
 */
export function isAuthorityInitialized() {
  try {
    getAuthorityWallet();
    return true;
  } catch {
    return false;
  }
}
