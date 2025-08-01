import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import BN from "bn.js";
import fs from "fs";
import path from "path";

// Smart contract IDL and program ID
const PROGRAM_ID = "CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY"; // From IDL file
const IDL_PATH = "./smart-contract/target/idl/smart_contract.json";

// Local network connection only
const LOCAL_CONNECTION = new Connection("http://localhost:8899", "confirmed");

/**
 * Initialize a vault on local Solana network
 */
export async function initializeVault(metadataUri, totalSupply, payerSecretKey) {
  try {
    console.log(`🏠 Using localhost only for all operations`);
    console.log(`📝 Program ID: ${PROGRAM_ID}`);

    // Generate a new keypair for the payer (simple local testing)
    const payerKeypair = Keypair.generate();
    console.log(`🔑 Generated payer wallet: ${payerKeypair.publicKey.toString()}`);

    // Check local balance and airdrop if needed
    const balance = await LOCAL_CONNECTION.getBalance(payerKeypair.publicKey);
    console.log(`💰 Local balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
      console.log("💧 Requesting local airdrop...");
      try {
        const airdropSignature = await LOCAL_CONNECTION.requestAirdrop(
          payerKeypair.publicKey,
          10 * anchor.web3.LAMPORTS_PER_SOL // Request 10 SOL for local testing
        );
        await LOCAL_CONNECTION.confirmTransaction(airdropSignature, "confirmed");
        console.log("✅ Local airdrop completed!");

        // Wait for balance to update
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newBalance = await LOCAL_CONNECTION.getBalance(payerKeypair.publicKey);
        console.log(`💰 New local balance: ${newBalance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
      } catch (airdropError) {
        console.log("❌ Local airdrop failed:", airdropError.message);
        throw new Error(`Local airdrop failed: ${airdropError.message}`);
      }
    }

    // Set up wallet and provider for local network
    const wallet = new anchor.Wallet(payerKeypair);
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

    console.log(`🚀 Initializing vault with:
      - Metadata URI: ${metadataUri}
      - Total Supply: ${totalSupply}
      - Vault Address: ${vaultKeypair.publicKey.toString()}
      - Authority: ${payerKeypair.publicKey.toString()}`);

    // Send transaction to local smart contract
    try {
      const tx = await program.methods
        .initializeVault(metadataUri, totalSupplyBN)
        .accounts({
          vault: vaultKeypair.publicKey,
          authority: payerKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([vaultKeypair])
        .rpc();

      console.log("✅ Vault initialized successfully on local network!");
      console.log("📝 Transaction signature:", tx);

      return {
        success: true,
        vaultPublicKey: vaultKeypair.publicKey.toString(),
        transactionSignature: tx,
        authority: payerKeypair.publicKey.toString(),
        network: "localhost",
        payerWallet: payerKeypair.publicKey.toString(),
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

    // Validate vault address
    if (!vaultAddress || typeof vaultAddress !== 'string' || vaultAddress.length < 32) {
      throw new Error("Invalid vault address format");
    }

    let vaultPublicKey;
    try {
      vaultPublicKey = new PublicKey(vaultAddress);
    } catch (error) {
      throw new Error(`Invalid vault address: ${vaultAddress}. Must be a valid base58 Solana address.`);
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
    
    return {
      success: true,
      vault: {
        authority: vaultAccount.authority.toString(),
        metadataUri: vaultAccount.metadata_uri,
        totalSupply: vaultAccount.total_supply.toString(),
        isFractionalized: vaultAccount.is_fractionalized,
        buyoutStatus: vaultAccount.buyout_status,
        tokenMint: vaultAccount.token_mint ? vaultAccount.token_mint.toString() : null,
      },
    };
  } catch (error) {
    console.error("❌ Error fetching vault info:", error);
    throw new Error(`Failed to fetch vault info: ${error.message}`);
  }
}
