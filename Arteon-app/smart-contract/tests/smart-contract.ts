import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SmartContract } from "../target/types/smart_contract";
import { Keypair } from "@solana/web3.js";

describe("smart-contract", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SmartContract as Program<SmartContract>;
  const provider = anchor.getProvider() as anchor.AnchorProvider;

  // Generate a new keypair for the counter account
  const counterKeypair = Keypair.generate();

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods
      .initialize()
      .accounts({
        counter: counterKeypair.publicKey,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([counterKeypair])
      .rpc();
    console.log("Your transaction signature", tx);

    // Fetch the created counter
    const counterAccount = await program.account.counter.fetch(counterKeypair.publicKey);
    console.log("Counter value:", counterAccount.count.toString());
  });
});
