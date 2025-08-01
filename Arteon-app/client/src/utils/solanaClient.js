import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import idl from '../../../smart-contract/target/idl/smart_contract.json';

// Solana connection
const connection = new Connection(process.env.VITE_SOLANA_RPC_URL || 'http://localhost:8899', 'confirmed');

// Program ID
const PROGRAM_ID = new PublicKey('6BoiezFL64ETgYVmNAE3w3di2qoQDEU6BMHt3Yqfe9XU');

// Provider setup
const getProvider = (wallet) => {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: 'confirmed',
    preflightCommitment: 'confirmed',
  });
  return provider;
};

// Program instance
const getProgram = (wallet) => {
  const provider = getProvider(wallet);
  return new Program(idl, PROGRAM_ID, provider);
};

// Helper functions
export const getAssociatedTokenAddress = async (mint, owner) => {
  return await web3.PublicKey.findProgramAddress(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
};

export const getVaultPda = (nftMint) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), nftMint.toBuffer()],
    PROGRAM_ID
  );
};

export const getVotePda = (vault, voter) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vote'), vault.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
};

// Smart contract functions
export const initializeVault = async (wallet, nftMint, artistRoyaltyBps, rentPricePerDay) => {
  try {
    const program = getProgram(wallet);
    const [vaultPda, vaultBump] = getVaultPda(nftMint);
    const [tokenMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mint'), vaultPda.toBuffer()],
      PROGRAM_ID
    );

    const tx = await program.methods
      .initializeVault(artistRoyaltyBps, new BN(rentPricePerDay))
      .accounts({
        authority: wallet.publicKey,
        nftMint: nftMint,
        nftAccount: await getAssociatedTokenAddress(nftMint, vaultPda),
        vault: vaultPda,
        tokenMint: tokenMintPda,
        userTokenAccount: await getAssociatedTokenAddress(tokenMintPda, wallet.publicKey),
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return { success: true, tx, vaultPda, tokenMintPda };
  } catch (error) {
    console.error('Error initializing vault:', error);
    return { success: false, error };
  }
};

export const fractionalize = async (wallet, vaultPda, nftMint, tokenMint, amount) => {
  try {
    const program = getProgram(wallet);
    
    const tx = await program.methods
      .fractionalize(new BN(amount))
      .accounts({
        authority: wallet.publicKey,
        vault: vaultPda,
        userNftAccount: await getAssociatedTokenAddress(nftMint, wallet.publicKey),
        vaultNftAccount: await getAssociatedTokenAddress(nftMint, vaultPda),
        tokenMint: tokenMint,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, wallet.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .rpc();

    return { success: true, tx };
  } catch (error) {
    console.error('Error fractionalizing:', error);
    return { success: false, error };
  }
};

export const voteBuyout = async (wallet, vaultPda, tokenMint, voteForBuyout) => {
  try {
    const program = getProgram(wallet);
    const [votePda] = getVotePda(vaultPda, wallet.publicKey);
    
    const tx = await program.methods
      .voteBuyout(voteForBuyout)
      .accounts({
        voter: wallet.publicKey,
        vault: vaultPda,
        voterTokenAccount: await getAssociatedTokenAddress(tokenMint, wallet.publicKey),
        vote: votePda,
        systemProgram: web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return { success: true, tx };
  } catch (error) {
    console.error('Error voting:', error);
    return { success: false, error };
  }
};

export const redeem = async (wallet, vaultPda, tokenMint, amount) => {
  try {
    const program = getProgram(wallet);
    
    const tx = await program.methods
      .redeem(new BN(amount))
      .accounts({
        user: wallet.publicKey,
        vault: vaultPda,
        userTokenAccount: await getAssociatedTokenAddress(tokenMint, wallet.publicKey),
        tokenMint: tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return { success: true, tx };
  } catch (error) {
    console.error('Error redeeming:', error);
    return { success: false, error };
  }
};

export const buyout = async (wallet, vaultPda, nftMint, tokenMint, platformFeeAccount, artistAccount) => {
  try {
    const program = getProgram(wallet);
    
    const tx = await program.methods
      .buyout()
      .accounts({
        buyer: wallet.publicKey,
        vault: vaultPda,
        vaultNftAccount: await getAssociatedTokenAddress(nftMint, vaultPda),
        buyerNftAccount: await getAssociatedTokenAddress(nftMint, wallet.publicKey),
        buyerTokenAccount: await getAssociatedTokenAddress(tokenMint, wallet.publicKey),
        platformFeeAccount: platformFeeAccount,
        artistAccount: artistAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
      })
      .rpc();

    return { success: true, tx };
  } catch (error) {
    console.error('Error buyout:', error);
    return { success: false, error };
  }
};

// Utility functions
export const getVaultInfo = async (vaultPda) => {
  try {
    const program = getProgram();
    const vault = await program.account.vault.fetch(vaultPda);
    return { success: true, vault };
  } catch (error) {
    console.error('Error fetching vault info:', error);
    return { success: false, error };
  }
};

export const getVoteInfo = async (votePda) => {
  try {
    const program = getProgram();
    const vote = await program.account.vote.fetch(votePda);
    return { success: true, vote };
  } catch (error) {
    console.error('Error fetching vote info:', error);
    return { success: false, error };
  }
}; 