import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContract } from "../target/types/smart_contract";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

export interface InitializeVaultParams {
  metadataUri: string;
  totalSupply: number;
  programId: PublicKey;
  payerKeypair: Keypair;
}

export interface InitializeVaultResult {
  vaultPublicKey: PublicKey;
  transactionSignature: string;
}

/**
 * Initializes a new vault on the Solana blockchain
 * @param params - The parameters for vault initialization
 * @returns Promise containing the vault public key and transaction signature
 */
export async function initializeVault(params: InitializeVaultParams): Promise<InitializeVaultResult> {
  const { metadataUri, totalSupply, programId, payerKeypair } = params;

  // Set up the provider with the payer keypair
  const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));
  const wallet = new anchor.Wallet(payerKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  // Create program instance
  const program = new Program<SmartContract>(
    require("../target/idl/smart_contract.json"),
    programId,
    provider
  );

  // Generate a new keypair for the vault PDA
  const vaultKeypair = Keypair.generate();

  // Convert totalSupply to BN for the smart contract
  const totalSupplyBN = new anchor.BN(totalSupply);

  try {
    // Send transaction to initialize the vault
    const transactionSignature = await program.methods
      .initializeVault(metadataUri, totalSupplyBN)
      .accounts({
        vault: vaultKeypair.publicKey,
        authority: payerKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([vaultKeypair])
      .rpc();

    return {
      vaultPublicKey: vaultKeypair.publicKey,
      transactionSignature,
    };
  } catch (error) {
    throw new Error(`Failed to initialize vault: ${error.message}`);
  }
}

/**
 * Convenience function using the deployed program ID
 */
export async function initializeVaultWithDeployedProgram(
  metadataUri: string,
  totalSupply: number,
  payerKeypair: Keypair
): Promise<InitializeVaultResult> {
  const programId = new PublicKey("CRaskU2g9Wzenfm1s89z5LdDkgCoaMqo9dbHn7YXvTAY");

  return initializeVault({
    metadataUri,
    totalSupply,
    programId,
    payerKeypair,
  });
}
