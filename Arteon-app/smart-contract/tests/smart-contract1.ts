import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContract } from "../target/types/smart_contract";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { assert } from "chai";

describe("smart-contract", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SmartContract as Program<SmartContract>;
  
  // Test accounts
  const authority = Keypair.generate();
  const nftMint = Keypair.generate();
  const user = Keypair.generate();
  
  // PDAs
  let vaultPda: PublicKey;
  let vaultBump: number;
  let tokenMintPda: PublicKey;
  let tokenMintBump: number;
  
  before(async () => {
    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(authority.publicKey, 10 * LAMPORTS_PER_SOL)
    );
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(user.publicKey, 5 * LAMPORTS_PER_SOL)
    );
    
    // Derive PDAs
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), nftMint.publicKey.toBuffer()],
      program.programId
    );
    
    [tokenMintPda, tokenMintBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), vaultPda.toBuffer()],
      program.programId
    );
  });

  it("Initialize vault", async () => {
    const artistRoyaltyBps = 500; // 5%
    const rentPricePerDay = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL per day
    
    try {
      await program.methods
        .initializeVault(artistRoyaltyBps, new anchor.BN(rentPricePerDay))
        .accounts({
          authority: authority.publicKey,
          nftMint: nftMint.publicKey,
          nftAccount: await getAssociatedTokenAddress(nftMint.publicKey, vaultPda),
          vault: vaultPda,
          tokenMint: tokenMintPda,
          userTokenAccount: await getAssociatedTokenAddress(tokenMintPda, authority.publicKey),
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([authority])
        .rpc();
        
      console.log("Vault initialized successfully!");
    } catch (error) {
      console.error("Error initializing vault:", error);
      throw error;
    }
  });

  it("Fractionalize NFT", async () => {
    const fractionalAmount = 1000000; // 1 token (6 decimals)
    
    try {
      await program.methods
        .fractionalize(new anchor.BN(fractionalAmount))
        .accounts({
          authority: authority.publicKey,
          vault: vaultPda,
          userNftAccount: await getAssociatedTokenAddress(nftMint.publicKey, authority.publicKey),
          vaultNftAccount: await getAssociatedTokenAddress(nftMint.publicKey, vaultPda),
          tokenMint: tokenMintPda,
          userTokenAccount: await getAssociatedTokenAddress(tokenMintPda, authority.publicKey),
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();
        
      console.log("NFT fractionalized successfully!");
    } catch (error) {
      console.error("Error fractionalizing NFT:", error);
      throw error;
    }
  });

  it("Vote for buyout", async () => {
    const voteForBuyout = true;
    
    try {
      await program.methods
        .voteBuyout(voteForBuyout)
        .accounts({
          voter: user.publicKey,
          vault: vaultPda,
          voterTokenAccount: await getAssociatedTokenAddress(tokenMintPda, user.publicKey),
          vote: await getVotePda(vaultPda, user.publicKey),
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();
        
      console.log("Vote recorded successfully!");
    } catch (error) {
      console.error("Error voting:", error);
      throw error;
    }
  });

  it("Redeem tokens", async () => {
    const redeemAmount = 500000; // 0.5 tokens
    
    try {
      await program.methods
        .redeem(new anchor.BN(redeemAmount))
        .accounts({
          user: user.publicKey,
          vault: vaultPda,
          userTokenAccount: await getAssociatedTokenAddress(tokenMintPda, user.publicKey),
          tokenMint: tokenMintPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();
        
      console.log("Tokens redeemed successfully!");
    } catch (error) {
      console.error("Error redeeming tokens:", error);
      throw error;
    }
  });
});

// Helper functions
async function getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): Promise<PublicKey> {
  return await anchor.utils.token.associatedAddress({
    mint: mint,
    owner: owner,
  });
}

async function getVotePda(vault: PublicKey, voter: PublicKey): Promise<PublicKey> {
  const [votePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), vault.toBuffer(), voter.toBuffer()],
    anchor.workspace.SmartContract.programId
  );
  return votePda;
}
