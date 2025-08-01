import { Keypair } from "@solana/web3.js";
import { initializeVaultWithDeployedProgram } from "./initializeVault";

/**
 * Example usage of the initializeVault function
 */
async function example() {
  try {
    // Create or load a keypair for the payer (in practice, you'd load from file or env)
    const payerKeypair = Keypair.generate(); // Replace with your actual keypair

    // Example parameters
    const metadataUri = "ipfs://QmXxvxzJSHKyLwGzH9TQgt2DjvMSiYT4zdBPfwaEDJZT1A";
    const totalSupply = 1000000;

    // Initialize the vault
    const result = await initializeVaultWithDeployedProgram(
      metadataUri,
      totalSupply,
      payerKeypair
    );

    console.log("Vault initialized successfully!");
    console.log("Vault Public Key:", result.vaultPublicKey.toString());
    console.log("Transaction Signature:", result.transactionSignature);

    return result;
  } catch (error) {
    console.error("Error initializing vault:", error);
    throw error;
  }
}

// Export the example function
export { example as initializeVaultExample };
