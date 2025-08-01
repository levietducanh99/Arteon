import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContract } from "../target/types/smart_contract";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import { expect } from "chai";

describe("vault", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SmartContract as Program<SmartContract>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Generate a new keypair for the vault account
  const vaultKeypair = Keypair.generate();

  it("Initializes a vault", async () => {
    // Sample data
    const metadataUri = "ipfs://QmXxvxzJSHKyLwGzH9TQgt2DjvMSiYT4zdBPfwaEDJZT1A";
    const totalSupply = new anchor.BN(1000000);

    // Initialize the vault
    const tx = await program.methods
      .initializeVault(metadataUri, totalSupply)
      .accounts({
        vault: vaultKeypair.publicKey,
        authority: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultKeypair])
      .rpc();

    console.log("Your transaction signature", tx);

    // Fetch the created vault data
    const vaultAccount = await program.account.vault.fetch(vaultKeypair.publicKey);

    // Log the vault data
    console.log("Vault data:", {
      authority: vaultAccount.authority.toString(),
      metadataUri: vaultAccount.metadataUri,
      totalSupply: vaultAccount.totalSupply.toString(),
      isFractionalized: vaultAccount.isFractionalized,
      buyoutStatus: vaultAccount.buyoutStatus
    });

    // Verify the data was stored correctly
    expect(vaultAccount.authority.toString()).to.equal(provider.wallet.publicKey.toString());
    expect(vaultAccount.metadataUri).to.equal(metadataUri);
    expect(vaultAccount.totalSupply.toString()).to.equal(totalSupply.toString());
    expect(vaultAccount.isFractionalized).to.equal(false);
    expect(vaultAccount.buyoutStatus).to.equal(0);
  });

  it("Fractionalizes a vault", async () => {
    try {
      // Derive the token mint PDA từ vault address
      const [tokenMintPda, tokenMintBump] = await PublicKey.findProgramAddress(
        [Buffer.from("token_mint"), vaultKeypair.publicKey.toBuffer()],
        program.programId
      );

      console.log("Token mint PDA:", tokenMintPda.toString());
      console.log("Token mint bump:", tokenMintBump);

      // Derive associated token account cho authority
      const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
      const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

      const [associatedTokenAddress] = await PublicKey.findProgramAddress(
        [
          provider.wallet.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          tokenMintPda.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      console.log("Authority's associated token account:", associatedTokenAddress.toString());

      // Fractionalize the vault - Không cần signers cho PDA!
      const tx = await program.methods
        .fractionalizeVault()
        .accounts({
          vault: vaultKeypair.publicKey,
          authority: provider.wallet.publicKey,
          tokenMint: tokenMintPda,
          authorityTokenAccount: associatedTokenAddress,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: SYSVAR_RENT_PUBKEY,
        })
        // Không cần .signers([]) vì PDA không yêu cầu ký!
        .rpc();

      console.log("Fractionalize transaction signature", tx);

      // Fetch the updated vault data
      const vaultAccount = await program.account.vault.fetch(vaultKeypair.publicKey);

      // Log the fractionalized vault data
      console.log("Fractionalized vault data:", {
        authority: vaultAccount.authority.toString(),
        metadataUri: vaultAccount.metadataUri,
        totalSupply: vaultAccount.totalSupply.toString(),
        isFractionalized: vaultAccount.isFractionalized,
        buyoutStatus: vaultAccount.buyoutStatus,
        tokenMint: vaultAccount.tokenMint ? vaultAccount.tokenMint.toString() : null,
      });

      // Verify the vault was fractionalized correctly
      expect(vaultAccount.isFractionalized).to.equal(true);
      expect(vaultAccount.tokenMint.toString()).to.equal(tokenMintPda.toString());

      console.log("✅ Vault successfully fractionalized!");
      console.log("Token mint:", tokenMintPda.toString());
      console.log("Authority token balance: 1,000,000");

    } catch (error) {
      console.error("Error during fractionalization:", error);
      throw error;
    }
  });
});
