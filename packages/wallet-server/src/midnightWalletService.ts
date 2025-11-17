import { WalletBuilder } from "@midnight-ntwrk/wallet";
import {
  getZswapNetworkId,
  setNetworkId,
  NetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";
import { nativeToken } from "@midnight-ntwrk/zswap";
import { firstValueFrom } from "rxjs";
import { readWalletFromEnv } from "./envUtils.js";
import { MIDNIGHT_TESTNET_CONFIG } from "./config.js";

let walletInstance: Awaited<ReturnType<typeof WalletBuilder.build>> | null =
  null;
let isWalletInitialized = false;

/**
 * Initialize Midnight wallet if not already initialized
 */
async function initializeWallet(): Promise<
  Awaited<ReturnType<typeof WalletBuilder.build>>
> {
  if (walletInstance && isWalletInitialized) {
    return walletInstance;
  }

  const walletData = readWalletFromEnv();
  if (!walletData.seed) {
    throw new Error("WALLET_SEED not found in .env file");
  }

  // Set network to testnet
  setNetworkId(NetworkId.TestNet);

  // Build wallet
  walletInstance = await WalletBuilder.build(
    MIDNIGHT_TESTNET_CONFIG.indexer,
    MIDNIGHT_TESTNET_CONFIG.indexerWS,
    MIDNIGHT_TESTNET_CONFIG.proofServer,
    MIDNIGHT_TESTNET_CONFIG.node,
    walletData.seed,
    getZswapNetworkId()
  );

  walletInstance.start();

  // Wait for wallet to sync
  await new Promise((resolve) => setTimeout(resolve, 3000));

  isWalletInitialized = true;
  return walletInstance;
}

/**
 * Get current wallet balance in tDUST
 */
export async function getTDustBalance(): Promise<bigint> {
  const wallet = await initializeWallet();
  const state = await firstValueFrom(wallet.state());
  return state.balances[nativeToken()] || 0n;
}

/**
 * Send tDUST to a recipient address
 * @param recipientAddress - Midnight address to send to (bech32m format)
 * @param amount - Amount in tDUST (will be converted to microTusdt: 1 tDUST = 1,000,000 microTusdt)
 * @returns Transaction ID
 */
export async function sendTDust(
  recipientAddress: string,
  amount: bigint
): Promise<string> {
  const wallet = await initializeWallet();

  // Convert tDUST to microTusdt (1 tDUST = 1,000,000 microTusdt)
  // Amount is expected in tDUST, so multiply by 1,000,000
  const transferAmount = amount * BigInt(1_000_000);

  // Check balance
  const state = await firstValueFrom(wallet.state());
  const balance = state.balances[nativeToken()] || 0n;

  if (balance < transferAmount) {
    throw new Error(
      `Insufficient balance. Required: ${transferAmount} microTusdt, Available: ${balance} microTusdt`
    );
  }

  // Create transfer transaction
  const transferRecipe = await wallet.transferTransaction([
    {
      amount: transferAmount,
      type: nativeToken(),
      receiverAddress: recipientAddress,
    },
  ]);

  // Prove transaction
  const provenTx = await wallet.proveTransaction(transferRecipe);

  // Submit transaction
  const txId = await wallet.submitTransaction(provenTx);

  return txId;
}

/**
 * Check balance for a wallet from seed
 * @param seed - Wallet seed (64-character hex string)
 * @returns Object with address, balance, and formatted balance
 */
export async function checkBalanceFromSeed(seed: string): Promise<{
  address: string;
  balance: bigint;
  formattedBalance: string;
}> {
  // Set network to testnet
  setNetworkId(NetworkId.TestNet);

  console.log("🔗 Connecting to Midnight testnet...");

  // Build wallet from seed
  const wallet = await WalletBuilder.build(
    MIDNIGHT_TESTNET_CONFIG.indexer,
    MIDNIGHT_TESTNET_CONFIG.indexerWS,
    MIDNIGHT_TESTNET_CONFIG.proofServer,
    MIDNIGHT_TESTNET_CONFIG.node,
    seed,
    getZswapNetworkId()
  );

  wallet.start();

  // Wait for wallet to initialize and sync
  console.log("⏳ Syncing wallet...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Get wallet state
  const state = await firstValueFrom(wallet.state());
  const balance = state.balances[nativeToken()] || 0n;
  const address = state.address;

  // Close wallet
  await wallet.close();

  // Format balance: tDUST has 6 decimals (microTusdt)
  const formattedBalance = formatBalance(balance);

  return {
    address,
    balance,
    formattedBalance,
  };
}

/**
 * Format balance from microTusdt to tDUST
 * @param balance - Balance in microTusdt (1 tDUST = 1,000,000 microTusdt)
 * @returns Formatted balance string
 */
function formatBalance(balance: bigint): string {
  const tdustAmount = Number(balance) / 1_000_000;
  return tdustAmount.toFixed(6);
}

/**
 * Wait for and verify incoming tDUST transaction
 * @param expectedAmount - Expected amount in tDUST units
 * @param senderAddress - Expected sender Midnight address (optional)
 * @param maxWaitTime - Maximum time to wait in milliseconds (default: 120000)
 * @returns Object with verification details
 */
export async function waitForTDustTransaction(
  expectedAmount: bigint,
  senderAddress?: string,
  maxWaitTime: number = 120000
): Promise<{ verified: boolean; receivedAmount: bigint }> {
  const wallet = await initializeWallet();
  const startTime = Date.now();
  const initialBalance = await getTDustBalance();

  console.log(`⏳ Waiting for tDUST transaction of ${expectedAmount} tDUST...`);
  console.log(
    `📊 Initial balance: ${Number(initialBalance) / 1_000_000} tDUST`
  );

  // Convert expected amount to microTusdt for comparison
  const expectedAmountMicroTusdt = expectedAmount * BigInt(1_000_000);

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const currentBalance = await getTDustBalance();

      if (currentBalance > initialBalance) {
        const receivedAmount = currentBalance - initialBalance;

        console.log(
          `💰 Balance increased by: ${Number(receivedAmount) / 1_000_000} tDUST`
        );
        console.log(
          `🎯 Expected amount: ${Number(expectedAmountMicroTusdt) / 1_000_000} tDUST`
        );

        // Check if received amount matches expected amount (with small tolerance for potential fees)
        const tolerance = BigInt(1_000); // 0.001 tDUST tolerance
        if (
          receivedAmount >= expectedAmountMicroTusdt - tolerance &&
          receivedAmount <= expectedAmountMicroTusdt + tolerance
        ) {
          console.log(
            `✅ tDUST transaction verified! Received: ${Number(receivedAmount) / 1_000_000} tDUST`
          );
          return { verified: true, receivedAmount };
        } else {
          console.log(
            `⚠️ Received amount doesn't match expected. Received: ${Number(receivedAmount) / 1_000_000}, Expected: ${expectedAmount} tDUST`
          );
        }
      }
    } catch (error) {
      console.log("Error checking balance:", error);
    }

    // Wait 3 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`tDUST transaction not received within ${maxWaitTime}ms`);
}

/**
 * Send tDUST from a wallet created from seed
 * @param seed - Wallet seed (64-character hex string)
 * @param recipientAddress - Midnight address to send to (bech32m format)
 * @param amount - Amount in tDUST (will be converted to microTusdt: 1 tDUST = 1,000,000 microTusdt)
 * @returns Transaction ID
 */
export async function sendTDustFromSeed(
  seed: string,
  recipientAddress: string,
  amount: bigint
): Promise<string> {
  // Set network to testnet
  setNetworkId(NetworkId.TestNet);

  console.log("🔗 Connecting to Midnight testnet with provided seed...");

  // Build wallet from seed
  const wallet = await WalletBuilder.build(
    MIDNIGHT_TESTNET_CONFIG.indexer,
    MIDNIGHT_TESTNET_CONFIG.indexerWS,
    MIDNIGHT_TESTNET_CONFIG.proofServer,
    MIDNIGHT_TESTNET_CONFIG.node,
    seed,
    getZswapNetworkId()
  );

  wallet.start();

  // Wait for wallet to initialize and sync
  console.log("⏳ Syncing wallet...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Get wallet state and check balance
  const state = await firstValueFrom(wallet.state());
  const balance = state.balances[nativeToken()] || 0n;

  // Convert tDUST to microTusdt (1 tDUST = 1,000,000 microTusdt)
  const transferAmount = amount * BigInt(1_000_000);

  if (balance < transferAmount) {
    await wallet.close();
    throw new Error(
      `Insufficient balance. Required: ${transferAmount} microTusdt, Available: ${balance} microTusdt`
    );
  }

  console.log(`💰 Wallet balance: ${Number(balance) / 1_000_000} tDUST`);
  console.log(`📤 Sending ${amount} tDUST to ${recipientAddress}...`);

  // Create transfer transaction
  const transferRecipe = await wallet.transferTransaction([
    {
      amount: transferAmount,
      type: nativeToken(),
      receiverAddress: recipientAddress,
    },
  ]);

  // Prove transaction
  const provenTx = await wallet.proveTransaction(transferRecipe);

  // Submit transaction
  const txId = await wallet.submitTransaction(provenTx);

  // Close wallet
  await wallet.close();

  console.log(`✅ Transaction submitted! Transaction ID: ${txId}`);

  return txId;
}

/**
 * Close wallet connection (cleanup)
 */
export async function closeWallet(): Promise<void> {
  if (walletInstance) {
    await walletInstance.close();
    walletInstance = null;
    isWalletInitialized = false;
  }
}
