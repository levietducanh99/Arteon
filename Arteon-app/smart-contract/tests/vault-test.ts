import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContract } from "../target/types/smart_contract";
import { Keypair } from "@solana/web3.js";
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
});
