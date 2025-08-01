import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import BN from "bn.js";
import fs from "fs";
import path from "path";
import { getAuthorityWallet, initializeAuthorityWallet, getAuthorityPublicKey } from "./authorityWallet.js";
import Fractionalization from "../models/fractionalization.models.js";
import Pin from "../models/pin.models.js";

// Smart contract IDL and program ID
const PROGRAM_ID = "CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY";
const IDL_PATH = "./smart-contract/target/idl/smart_contract.json";

// Local network connection
const LOCAL_CONNECTION = new Connection("http://localhost:8899", "confirmed");

/**
 * Fractionalize a vault on Solana blockchain using server authority wallet
 * @param {string} vaultPubkey - Base58 string of vault public key
 * @param {Uint8Array|string|null} authoritySecretKey - Authority secret key (null = use server authority)
 * @param {boolean} autoAirdrop - Whether to auto airdrop SOL if balance is low
 * @returns {Promise<Object>} Result with vault info after fractionalization
 */
export async function fractionalizeVault(vaultPubkey, authoritySecretKey = null, autoAirdrop = true) {
  try {
    console.log("🔧 Starting vault fractionalization process...");
    console.log("📝 Vault PublicKey:", vaultPubkey);

    // Validate and parse vault public key
    let vaultPublicKey;
    try {
      vaultPublicKey = new PublicKey(vaultPubkey);
    } catch (error) {
      throw new Error(`Invalid vault public key: ${vaultPubkey}`);
    }

    // Parse authority keypair
    let authorityKeypair;

    if (authoritySecretKey === null) {
      // Use server authority wallet
      console.log("🔑 Using server authority wallet...");
      try {
        authorityKeypair = getAuthorityWallet();
        console.log("✅ Server authority wallet loaded");
      } catch (error) {
        throw new Error("Server authority wallet not available. Make sure server is properly initialized.");
      }
    } else if (typeof authoritySecretKey === 'string') {
      // Load from file path
      const secretKeyPath = path.resolve(process.cwd(), authoritySecretKey);
      if (!fs.existsSync(secretKeyPath)) {
        throw new Error(`Authority secret key file not found: ${secretKeyPath}`);
      }
      const secretKeyData = JSON.parse(fs.readFileSync(secretKeyPath, 'utf8'));
      authorityKeypair = Keypair.fromSecretKey(new Uint8Array(secretKeyData));
    } else if (authoritySecretKey instanceof Uint8Array || Array.isArray(authoritySecretKey)) {
      // Use directly
      const secretKeyUint8 = authoritySecretKey instanceof Uint8Array
        ? authoritySecretKey
        : new Uint8Array(authoritySecretKey);
      authorityKeypair = Keypair.fromSecretKey(secretKeyUint8);
    } else {
      throw new Error("Authority secret key must be null (use server), Uint8Array, Array, or file path string");
    }

    console.log("🔑 Authority PublicKey:", authorityKeypair.publicKey.toString());

    // Check authority balance and airdrop if needed
    const balance = await LOCAL_CONNECTION.getBalance(authorityKeypair.publicKey);
    console.log(`💰 Authority balance: ${balance / anchor.web3.LAMPORTS_PER_SOL} SOL`);

    const requiredBalance = 0.1 * anchor.web3.LAMPORTS_PER_SOL; // Require 0.1 SOL
    if (balance < requiredBalance) {
      if (autoAirdrop) {
        console.log("💧 Insufficient balance, requesting airdrop...");
        try {
          const airdropSignature = await LOCAL_CONNECTION.requestAirdrop(
            authorityKeypair.publicKey,
            2 * anchor.web3.LAMPORTS_PER_SOL // Airdrop 2 SOL
          );
          await LOCAL_CONNECTION.confirmTransaction(airdropSignature, "confirmed");
          console.log("✅ Airdrop completed!");

          // Wait for balance to update
          await new Promise(resolve => setTimeout(resolve, 2000));

          const newBalance = await LOCAL_CONNECTION.getBalance(authorityKeypair.publicKey);
          console.log(`💰 New authority balance: ${newBalance / anchor.web3.LAMPORTS_PER_SOL} SOL`);
        } catch (airdropError) {
          console.log("❌ Airdrop failed:", airdropError.message);
          throw new Error(`Insufficient SOL balance and airdrop failed: ${airdropError.message}`);
        }
      } else {
        throw new Error("Insufficient SOL balance for authority. Need at least 0.1 SOL");
      }
    }

    // Calculate PDA for token mint
    const [tokenMintPDA, tokenMintBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("token_mint"),
        vaultPublicKey.toBuffer(),
      ],
      new PublicKey(PROGRAM_ID)
    );

    console.log("🏭 Token Mint PDA:", tokenMintPDA.toString());
    console.log("🎯 Token Mint Bump:", tokenMintBump);

    // Calculate Associated Token Account for authority
    const authorityTokenAccount = await getAssociatedTokenAddress(
      tokenMintPDA,
      authorityKeypair.publicKey,
      false, // allowOwnerOffCurve
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    console.log("💰 Authority Token Account:", authorityTokenAccount.toString());

    // Set up wallet and provider
    const wallet = new anchor.Wallet(authorityKeypair);
    const provider = new anchor.AnchorProvider(LOCAL_CONNECTION, wallet, {
      preflightCommitment: "confirmed",
    });
    anchor.setProvider(provider);

    // Load IDL
    const idlPath = path.resolve(process.cwd(), IDL_PATH);
    if (!fs.existsSync(idlPath)) {
      throw new Error(`IDL file not found: ${idlPath}`);
    }
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

    // Create program instance
    const program = new anchor.Program(idl, provider);

    // Get current vault state to verify it exists and is not already fractionalized
    console.log("🔍 Checking current vault state...");
    let vaultAccount;
    try {
      vaultAccount = await program.account.vault.fetch(vaultPublicKey);
    } catch (error) {
      throw new Error(`Vault not found or invalid: ${vaultPubkey}`);
    }

    // Check if vault is already fractionalized
    if (vaultAccount.isFractionalized) {
      throw new Error("Vault has already been fractionalized");
    }

    // Verify authority
    if (!vaultAccount.authority.equals(authorityKeypair.publicKey)) {
      throw new Error("Unauthorized: Only vault authority can fractionalize the vault");
    }

    console.log("✅ Vault validation passed");
    console.log("📊 Vault total supply:", vaultAccount.totalSupply.toString());

    // Check if token mint PDA already exists (shouldn't exist if not fractionalized)
    try {
      const existingMint = await LOCAL_CONNECTION.getAccountInfo(tokenMintPDA);
      if (existingMint) {
        throw new Error("Token mint PDA already exists. Vault may have been partially fractionalized.");
      }
    } catch (error) {
      // Expected if mint doesn't exist yet
      console.log("✅ Token mint PDA is available");
    }

    console.log("🚀 Calling fractionalize_vault instruction...");

    // Call fractionalize_vault instruction
    const txSignature = await program.methods
      .fractionalizeVault()
      .accounts({
        vault: vaultPublicKey,
        authority: authorityKeypair.publicKey,
        tokenMint: tokenMintPDA,
        authorityTokenAccount: authorityTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authorityKeypair])
      .rpc();

    console.log("✅ Fractionalization transaction confirmed!");
    console.log("📝 Transaction signature:", txSignature);

    // Wait for confirmation
    await LOCAL_CONNECTION.confirmTransaction(txSignature, "confirmed");

    // Fetch updated vault state
    const updatedVaultAccount = await program.account.vault.fetch(vaultPublicKey);

    // Get token account balance
    let tokenBalance = "0";
    try {
      const tokenAccountInfo = await LOCAL_CONNECTION.getTokenAccountBalance(authorityTokenAccount);
      tokenBalance = tokenAccountInfo.value.amount;
    } catch (error) {
      console.warn("Could not fetch token balance:", error.message);
    }

    console.log("🎉 Vault successfully fractionalized!");

    // Lưu thông tin fractionalization vào database
    let fractionalizationRecord = null;
    try {
      console.log("💾 Saving fractionalization data to database...");

      // Tạo record fractionalization
      fractionalizationRecord = new Fractionalization({
        vaultPublicKey: vaultPublicKey.toString(),
        tokenMintAddress: tokenMintPDA.toString(),
        authorityAddress: authorityKeypair.publicKey.toString(),
        authorityTokenAccount: authorityTokenAccount.toString(),
        totalSupply: updatedVaultAccount.totalSupply.toString(),
        tokenBalance: tokenBalance,
        transactionSignature: txSignature,
        metadata: updatedVaultAccount.metadataUri,
        network: "localhost",
      });

      await fractionalizationRecord.save();
      console.log("✅ Fractionalization data saved to database");

      // Cập nhật Pin nếu có liên kết (metadata chứa pin ID)
      if (updatedVaultAccount.metadataUri && updatedVaultAccount.metadataUri.startsWith('pin:')) {
        const pinId = updatedVaultAccount.metadataUri.replace('pin:', '');
        try {
          await Pin.findByIdAndUpdate(pinId, {
            isFractionalized: true,
            fractionalizationData: {
              tokenMintAddress: tokenMintPDA.toString(),
              tokenBalance: tokenBalance,
              fractionalizedAt: new Date(),
              transactionSignature: txSignature,
            }
          });
          console.log("✅ Pin updated with fractionalization data");
        } catch (pinUpdateError) {
          console.warn("⚠️ Could not update pin with fractionalization data:", pinUpdateError.message);
        }
      }

    } catch (dbError) {
      console.error("❌ Failed to save fractionalization data to database:", dbError);
      // Không throw error vì vault đã được fractionalized thành công trên blockchain
    }

    return {
      success: true,
      transactionSignature: txSignature,
      vault: {
        publicKey: vaultPublicKey.toString(),
        authority: updatedVaultAccount.authority.toString(),
        metadataUri: updatedVaultAccount.metadataUri,
        totalSupply: updatedVaultAccount.totalSupply.toString(),
        isFractionalized: updatedVaultAccount.isFractionalized,
        buyoutStatus: updatedVaultAccount.buyoutStatus,
        tokenMint: updatedVaultAccount.tokenMint ? updatedVaultAccount.tokenMint.toString() : null,
      },
      tokenInfo: {
        mintAddress: tokenMintPDA.toString(),
        authorityTokenAccount: authorityTokenAccount.toString(),
        authorityTokenBalance: tokenBalance,
        decimals: 9,
      },
      network: "localhost",
      // Thêm database ID để reference (có thể null nếu save DB thất bại)
      fractionalizationId: fractionalizationRecord ? fractionalizationRecord._id : null,
    };

  } catch (error) {
    console.error("❌ Error fractionalizing vault:", error);
    throw new Error(`Failed to fractionalize vault: ${error.message}`);
  }
}

/**
 * Get vault information including fractionalization status
 * @param {string} vaultPubkey - Base58 string of vault public key
 * @returns {Promise<Object>} Vault information
 */
export async function getVaultFractionalizationInfo(vaultPubkey) {
  try {
    const vaultPublicKey = new PublicKey(vaultPubkey);

    // Load IDL and create program
    const idlPath = path.resolve(process.cwd(), IDL_PATH);
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf8"));

    const provider = new anchor.AnchorProvider(LOCAL_CONNECTION, {
      publicKey: PublicKey.default,
      signTransaction: () => Promise.reject(),
      signAllTransactions: () => Promise.reject(),
    }, { commitment: "confirmed" });

    const program = new anchor.Program(idl, provider);
    const vaultAccount = await program.account.vault.fetch(vaultPublicKey);

    let tokenInfo = null;
    if (vaultAccount.isFractionalized && vaultAccount.tokenMint) {
      // Get token mint PDA info
      const [tokenMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("token_mint"), vaultPublicKey.toBuffer()],
        new PublicKey(PROGRAM_ID)
      );

      tokenInfo = {
        mintAddress: tokenMintPDA.toString(),
        expectedMintAddress: vaultAccount.tokenMint.toString(),
        mintMatch: tokenMintPDA.equals(vaultAccount.tokenMint),
      };
    }

    return {
      success: true,
      vault: {
        publicKey: vaultPublicKey.toString(),
        authority: vaultAccount.authority.toString(),
        metadataUri: vaultAccount.metadataUri,
        totalSupply: vaultAccount.totalSupply.toString(),
        isFractionalized: vaultAccount.isFractionalized,
        buyoutStatus: vaultAccount.buyoutStatus,
        tokenMint: vaultAccount.tokenMint ? vaultAccount.tokenMint.toString() : null,
      },
      tokenInfo,
    };
  } catch (error) {
    throw new Error(`Failed to get vault info: ${error.message}`);
  }
}
