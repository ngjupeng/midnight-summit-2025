import { webcrypto } from "node:crypto";
import { MIDNIGHT_TESTNET_CONFIG } from "./config.js";

/**
 * Generate a cryptographically secure 64-character hex seed phrase
 */
export function generateRandomSeed(): string {
  const bytes = new Uint8Array(32);
  webcrypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Create wallet instance to get the testnet address
 */
export async function createWalletForAddress(
  seed: string
): Promise<string | null> {
  try {
    // Import wallet builder dynamically to avoid module loading issues
    const { WalletBuilder } = await import("@midnight-ntwrk/wallet");
    const { getZswapNetworkId, setNetworkId, NetworkId } = await import(
      "@midnight-ntwrk/midnight-js-network-id"
    );

    // Set network to testnet before creating wallet
    setNetworkId(NetworkId.TestNet);

    console.log("🔗 Creating testnet wallet to get address...");

    const wallet = await WalletBuilder.build(
      MIDNIGHT_TESTNET_CONFIG.indexer,
      MIDNIGHT_TESTNET_CONFIG.indexerWS,
      MIDNIGHT_TESTNET_CONFIG.proofServer,
      MIDNIGHT_TESTNET_CONFIG.node,
      seed,
      getZswapNetworkId()
    );

    wallet.start();

    // Get the wallet state to extract the address
    const { firstValueFrom } = await import("rxjs");

    // Wait a moment for wallet to initialize
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const state = await firstValueFrom(wallet.state());
    const address = state.address;

    // Close the wallet
    await wallet.close();

    return address;
  } catch (error) {
    console.log(
      "💡 You can manually check your address after first deployment"
    );
    return null;
  }
}
