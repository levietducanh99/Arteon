import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContract } from "../target/types/smart_contract";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

describe("Buyout Tests", () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SmartContract as Program<SmartContract>;
  const provider = anchor.getProvider();

  // Test accounts
  let vaultKeypair: Keypair;
  let authority: Keypair;
  let buyer: Keypair;
  let vaultPubkey: PublicKey;
  let buyoutOfferPDA: PublicKey;
  let buyoutOfferBump: number;

  beforeEach(async () => {
    // Create new keypairs for each test
    vaultKeypair = Keypair.generate();
    authority = Keypair.generate();
    buyer = Keypair.generate();
    vaultPubkey = vaultKeypair.publicKey;

    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer.publicKey, 2 * LAMPORTS_PER_SOL)
    );

    // Derive buyout offer PDA
    [buyoutOfferPDA, buyoutOfferBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("buyout_offer"),
        vaultPubkey.toBuffer(),
        buyer.publicKey.toBuffer(),
      ],
      program.programId
    );
  });

  it("Successfully creates and fractionalizes a vault, then initiates buyout", async () => {
    const metadataUri = "ipfs://QmTestHash123";
    const totalSupply = new anchor.BN(1000000);
    const offerAmount = new anchor.BN(5 * LAMPORTS_PER_SOL); // 5 SOL offer

    // Step 1: Initialize vault
    console.log("🏗️  Initializing vault...");
    await program.methods
      .initializeVault(metadataUri, totalSupply)
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultKeypair, authority])
      .rpc();

    // Verify vault was created
    const vaultAccount = await program.account.vault.fetch(vaultPubkey);
    assert.equal(vaultAccount.authority.toString(), authority.publicKey.toString());
    assert.equal(vaultAccount.metadataUri, metadataUri);
    assert.equal(vaultAccount.totalSupply.toString(), totalSupply.toString());
    assert.equal(vaultAccount.isFractionalized, false);
    console.log("✅ Vault initialized successfully");

    // Step 2: Fractionalize vault
    console.log("🔀 Fractionalizing vault...");

    // Derive token mint PDA
    const [tokenMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_mint"), vaultPubkey.toBuffer()],
      program.programId
    );

    // Get authority's associated token account
    const authorityTokenAccount = await anchor.utils.token.associatedAddress({
      mint: tokenMintPDA,
      owner: authority.publicKey,
    });

    await program.methods
      .fractionalizeVault()
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        tokenMint: tokenMintPDA,
        authorityTokenAccount: authorityTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    // Verify fractionalization
    const fractionalizedVault = await program.account.vault.fetch(vaultPubkey);
    assert.equal(fractionalizedVault.isFractionalized, true);
    assert.isNotNull(fractionalizedVault.tokenMint);
    console.log("✅ Vault fractionalized successfully");
    console.log("🪙 Token mint:", fractionalizedVault.tokenMint.toString());

    // Step 3: Initiate buyout
    console.log("💰 Initiating buyout offer...");

    const txSignature = await program.methods
      .initiateBuyout(offerAmount)
      .accounts({
        vault: vaultPubkey,
        buyer: buyer.publicKey,
        buyoutOffer: buyoutOfferPDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    console.log("📝 Buyout transaction signature:", txSignature);

    // Step 4: Verify buyout offer was created correctly
    const buyoutOfferAccount = await program.account.buyoutOffer.fetch(buyoutOfferPDA);

    assert.equal(buyoutOfferAccount.vault.toString(), vaultPubkey.toString());
    assert.equal(buyoutOfferAccount.buyer.toString(), buyer.publicKey.toString());
    assert.equal(buyoutOfferAccount.offerAmount.toString(), offerAmount.toString());
    assert.isAbove(buyoutOfferAccount.timestamp.toNumber(), 0);

    console.log("✅ Buyout offer created successfully!");
    console.log("🏛️  Vault:", buyoutOfferAccount.vault.toString());
    console.log("👤 Buyer:", buyoutOfferAccount.buyer.toString());
    console.log("💵 Offer Amount:", buyoutOfferAccount.offerAmount.toString(), "lamports");
    console.log("⏰ Timestamp:", new Date(buyoutOfferAccount.timestamp.toNumber() * 1000).toISOString());
  });

  it("Fails to initiate buyout on non-fractionalized vault", async () => {
    const metadataUri = "ipfs://QmTestHash456";
    const totalSupply = new anchor.BN(1000000);
    const offerAmount = new anchor.BN(3 * LAMPORTS_PER_SOL);

    // Initialize vault but don't fractionalize it
    await program.methods
      .initializeVault(metadataUri, totalSupply)
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultKeypair, authority])
      .rpc();

    // Try to initiate buyout on non-fractionalized vault
    try {
      await program.methods
        .initiateBuyout(offerAmount)
        .accounts({
          vault: vaultPubkey,
          buyer: buyer.publicKey,
          buyoutOffer: buyoutOfferPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.include(error.message, "VaultNotFractionalized");
      console.log("✅ Correctly rejected buyout on non-fractionalized vault");
    }
  });

  it("Fails to initiate buyout with zero offer amount", async () => {
    const metadataUri = "ipfs://QmTestHash789";
    const totalSupply = new anchor.BN(1000000);
    const invalidOfferAmount = new anchor.BN(0);

    // Initialize and fractionalize vault
    await program.methods
      .initializeVault(metadataUri, totalSupply)
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultKeypair, authority])
      .rpc();

    const [tokenMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_mint"), vaultPubkey.toBuffer()],
      program.programId
    );

    const authorityTokenAccount = await anchor.utils.token.associatedAddress({
      mint: tokenMintPDA,
      owner: authority.publicKey,
    });

    await program.methods
      .fractionalizeVault()
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        tokenMint: tokenMintPDA,
        authorityTokenAccount: authorityTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    // Try to initiate buyout with zero amount
    try {
      await program.methods
        .initiateBuyout(invalidOfferAmount)
        .accounts({
          vault: vaultPubkey,
          buyer: buyer.publicKey,
          buyoutOffer: buyoutOfferPDA,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([buyer])
        .rpc();

      assert.fail("Expected transaction to fail");
    } catch (error) {
      assert.include(error.message, "InvalidOfferAmount");
      console.log("✅ Correctly rejected zero offer amount");
    }
  });

  it("Creates unique buyout offers for different buyers", async () => {
    const metadataUri = "ipfs://QmTestHashMulti";
    const totalSupply = new anchor.BN(1000000);
    const offerAmount1 = new anchor.BN(3 * LAMPORTS_PER_SOL);
    const offerAmount2 = new anchor.BN(4 * LAMPORTS_PER_SOL);

    // Create second buyer
    const buyer2 = Keypair.generate();
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(buyer2.publicKey, 2 * LAMPORTS_PER_SOL)
    );

    // Derive PDAs for both buyers
    const [buyoutOffer1PDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("buyout_offer"),
        vaultPubkey.toBuffer(),
        buyer.publicKey.toBuffer(),
      ],
      program.programId
    );

    const [buyoutOffer2PDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("buyout_offer"),
        vaultPubkey.toBuffer(),
        buyer2.publicKey.toBuffer(),
      ],
      program.programId
    );

    // Initialize and fractionalize vault
    await program.methods
      .initializeVault(metadataUri, totalSupply)
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([vaultKeypair, authority])
      .rpc();

    const [tokenMintPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("token_mint"), vaultPubkey.toBuffer()],
      program.programId
    );

    const authorityTokenAccount = await anchor.utils.token.associatedAddress({
      mint: tokenMintPDA,
      owner: authority.publicKey,
    });

    await program.methods
      .fractionalizeVault()
      .accounts({
        vault: vaultPubkey,
        authority: authority.publicKey,
        tokenMint: tokenMintPDA,
        authorityTokenAccount: authorityTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([authority])
      .rpc();

    // Create buyout offers from both buyers
    await program.methods
      .initiateBuyout(offerAmount1)
      .accounts({
        vault: vaultPubkey,
        buyer: buyer.publicKey,
        buyoutOffer: buyoutOffer1PDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    await program.methods
      .initiateBuyout(offerAmount2)
      .accounts({
        vault: vaultPubkey,
        buyer: buyer2.publicKey,
        buyoutOffer: buyoutOffer2PDA,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([buyer2])
      .rpc();

    // Verify both offers exist and are different
    const offer1 = await program.account.buyoutOffer.fetch(buyoutOffer1PDA);
    const offer2 = await program.account.buyoutOffer.fetch(buyoutOffer2PDA);

    assert.equal(offer1.buyer.toString(), buyer.publicKey.toString());
    assert.equal(offer2.buyer.toString(), buyer2.publicKey.toString());
    assert.equal(offer1.offerAmount.toString(), offerAmount1.toString());
    assert.equal(offer2.offerAmount.toString(), offerAmount2.toString());

    console.log("✅ Multiple unique buyout offers created successfully!");
    console.log("💰 Buyer 1 offer:", offer1.offerAmount.toString(), "lamports");
    console.log("💰 Buyer 2 offer:", offer2.offerAmount.toString(), "lamports");
  });
});
