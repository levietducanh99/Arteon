import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import path from "path";
import { getAuthorityWallet, initializeAuthorityWallet } from "./authorityWallet.js";

// Smart contract IDL and program ID
const PROGRAM_ID = "CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY"; // From IDL file
const IDL_PATH = "./smart-contract/target/idl/smart_contract.json";

// Local network connection only
const LOCAL_CONNECTION = new Connection("http://localhost:8899", "confirmed");

/**
 * Initialize a vault on local Solana network with fixed server authority
 */
export async function initializeVault(metadataUri, totalSupply, payerSecretKey) {
  try {
    console.log(`🏠 Using localhost only for all operations`);
    console.log(`📝 Program ID: ${PROGRAM_ID}`);

    // Initialize and get the fixed server authority wallet
    await initializeAuthorityWallet();
    const authorityKeypair = getAuthorityWallet();

    console.log(`🔑 Using fixed server authority: ${authorityKeypair.publicKey.toString()}`);

    // Check local balance (authority should already have SOL from initializeAuthorityWallet)
    const balance = await LOCAL_CONNECTION.getBalance(authorityKeypair.publicKey);
    console.log(`💰 Authority balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    // Set up wallet and provider for local network using fixed authority
    const wallet = new anchor.Wallet(authorityKeypair);
    const provider = new anchor.AnchorProvider(LOCAL_CONNECTION, wallet, {
      preflightCommitment: "confirmed",
    });
    anchor.setProvider(provider);

    // Load IDL
    const idlPath = path.resolve(process.cwd(), IDL_PATH);
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    
    // Create program instance
    const program = new anchor.Program(idl, provider);

    // Generate new vault keypair
    const vaultKeypair = Keypair.generate();

    // Convert total supply to BN
    const totalSupplyBN = new BN(totalSupply);

    console.log(`🚀 Initializing vault with fixed server authority:
      - Metadata URI: ${metadataUri}
      - Total Supply: ${totalSupply}
      - Vault Address: ${vaultKeypair.publicKey.toString()}
      - Fixed Authority: ${authorityKeypair.publicKey.toString()}`);

    // Send transaction to local smart contract
    try {
      const tx = await program.methods
        .initializeVault(metadataUri, totalSupplyBN)
        .accounts({
          vault: vaultKeypair.publicKey,
          authority: authorityKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([vaultKeypair])
        .rpc();

      console.log("✅ Vault initialized successfully with fixed server authority!");
      console.log("📝 Transaction signature:", tx);

      return {
        success: true,
        vaultPublicKey: vaultKeypair.publicKey.toString(),
        transactionSignature: tx,
        authority: authorityKeypair.publicKey.toString(),
        network: "localhost",
        payerWallet: authorityKeypair.publicKey.toString(),
        isFixedAuthority: true,
      };
    } catch (txError) {
      // Handle transaction errors
      if (txError.name === 'SendTransactionError') {
        console.error("❌ Transaction failed:");
        console.error("Message:", txError.transactionMessage);
        console.error("Logs:", txError.transactionLogs);

        if (txError.getLogs) {
          const logs = await txError.getLogs();
          console.error("Full logs:", logs);
        }
      }
      throw txError;
    }
  } catch (error) {
    console.error("❌ Error initializing vault:", error);
    throw new Error(`Failed to initialize vault: ${error.message}`);
  }
}

/**
 * Generate a new keypair for testing
 */
export function generateTestKeypair() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toString(),
    secretKey: Array.from(keypair.secretKey),
  };
}

/**
 * Get vault information from local network
 */
export async function getVaultInfo(vaultAddress) {
  try {
    console.log(`🏠 Getting vault info from localhost`);
    console.log(`📍 Vault address to check: ${vaultAddress}`);

    // Validate vault address
    if (!vaultAddress || typeof vaultAddress !== 'string') {
      throw new Error("Vault address is required and must be a string");
    }

    // Trim whitespace
    vaultAddress = vaultAddress.trim();

    // Basic length check for base58 encoded public key (typically 43-44 characters)
    if (vaultAddress.length < 32 || vaultAddress.length > 50) {
      throw new Error(`Invalid vault address length: ${vaultAddress.length}. Expected 32-50 characters for base58 encoded public key.`);
    }

    let vaultPublicKey;
    try {
      vaultPublicKey = new PublicKey(vaultAddress);
      console.log(`✅ Valid public key format: ${vaultPublicKey.toString()}`);
    } catch (error) {
      console.error(`❌ PublicKey parsing failed for: "${vaultAddress}"`);
      throw new Error(`Invalid vault address format: ${vaultAddress}. Must be a valid base58 Solana address. Error: ${error.message}`);
    }

    // Load IDL
    const idlPath = path.resolve(process.cwd(), IDL_PATH);
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
    
    // Create provider for account fetching
    const provider = new anchor.AnchorProvider(LOCAL_CONNECTION, {
      publicKey: PublicKey.default,
      signTransaction: () => Promise.reject(),
      signAllTransactions: () => Promise.reject(),
    }, { commitment: "confirmed" });

    const program = new anchor.Program(idl, provider);
    const vaultAccount = await program.account.vault.fetch(vaultPublicKey);
    
    console.log("🔍 Raw vault account data:", vaultAccount);

    return {
      success: true,
      vault: {
        authority: vaultAccount.authority ? vaultAccount.authority.toString() : null,
        metadataUri: vaultAccount.metadataUri || vaultAccount.metadata_uri || null,
        totalSupply: vaultAccount.totalSupply ? vaultAccount.totalSupply.toString() :
                    (vaultAccount.total_supply ? vaultAccount.total_supply.toString() : "0"),
        isFractionalized: vaultAccount.isFractionalized !== undefined ? vaultAccount.isFractionalized :
                         (vaultAccount.is_fractionalized !== undefined ? vaultAccount.is_fractionalized : false),
        buyoutStatus: vaultAccount.buyoutStatus !== undefined ? vaultAccount.buyoutStatus :
                     (vaultAccount.buyout_status !== undefined ? vaultAccount.buyout_status : 0),
        tokenMint: vaultAccount.tokenMint ? vaultAccount.tokenMint.toString() :
                  (vaultAccount.token_mint ? vaultAccount.token_mint.toString() : null),
      },
    };
  } catch (error) {
    console.error("❌ Error fetching vault info:", error);
    throw new Error(`Failed to fetch vault info: ${error.message}`);
  }
}
