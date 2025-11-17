import dotenv from "dotenv";
import { RpcProvider, hash, Account, uint256 } from "starknet";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const envPath = path.join(projectRoot, ".env");

dotenv.config({ path: envPath });

const STARKNET_RPC_URL =
  "https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_9/_hKu4IgnPgrF8O82GLuYU";
const STARKNET_ACCOUNT_ADDRESS =
  "0x0135353f55784cb5f1c1c7d2ec3f5d4dab42eff301834a9d8588550ae7a33ed4" as const;
const STRK_CONTRACT_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const STARKNET_PRIVATE_KEY = process.env.STARKNET_PRIVATE_KEY;

// STRK Transfer event selector - using the full event name from the ABI
// Event name: "src::strk::erc20_lockable::ERC20Lockable::Transfer"
const TRANSFER_EVENT_NAME = "Transfer";
const TRANSFER_EVENT_SELECTOR = `0x${hash.starknetKeccak(TRANSFER_EVENT_NAME).toString(16)}`;

interface TransferEvent {
  from: string;
  to: string;
  value: bigint;
}

/**
 * Get RPC provider
 */
function getProvider(): RpcProvider {
  return new RpcProvider({ nodeUrl: STARKNET_RPC_URL });
}

/**
 * Get Starknet account for signing transactions
 */
function getAccount(): Account {
  if (!STARKNET_PRIVATE_KEY) {
    throw new Error("STARKNET_PRIVATE_KEY not configured in environment");
  }

  const provider = getProvider();
  return new Account({
    provider,
    address: STARKNET_ACCOUNT_ADDRESS,
    signer: STARKNET_PRIVATE_KEY,
  });
}

/**
 * Send STRK tokens to a recipient address
 * @param recipientAddress - Starknet address to send STRK to
 * @param amount - Amount in wei (18 decimals)
 * @returns Transaction hash
 */
export async function sendSTRK(
  recipientAddress: string,
  amount: bigint
): Promise<string> {
  const account = getAccount();

  // Split u256 into low and high parts
  const amountUint256 = uint256.bnToUint256(amount);

  // Execute transfer
  const result = await account.execute([
    {
      contractAddress: STRK_CONTRACT_ADDRESS,
      entrypoint: "transfer",
      calldata: [
        recipientAddress,
        amountUint256.low.toString(),
        amountUint256.high.toString(),
      ],
    },
  ]);

  console.log(
    `✅ STRK transfer executed. Transaction hash: ${result.transaction_hash}`
  );
  return result.transaction_hash;
}

/**
 * Verify STRK transaction was sent to backend account with correct amount
 * @param txHash - Transaction hash to verify
 * @param expectedAmount - Expected amount in wei (18 decimals)
 * @param senderAddress - Address that should have sent the STRK
 * @returns True if transaction is valid, throws error if invalid
 */
export async function verifyStrkTransaction(
  txHash: string,
  expectedAmount: bigint,
  senderAddress?: string
): Promise<{ valid: boolean; transferEvent?: TransferEvent }> {
  if (!STARKNET_ACCOUNT_ADDRESS) {
    throw new Error("STARKNET_ACCOUNT_ADDRESS not configured in environment");
  }

  const provider = getProvider();

  try {
    // Fetch transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    // Verify transaction status
    const status = receipt.statusReceipt;
    if (status !== "SUCCEEDED") {
      throw new Error(`Transaction not confirmed. Status: ${status}`);
    }

    // Check events for Transfer
    const events = receipt.events || [];
    console.log("🚀 ~ verifyStrkTransaction ~ events:", events);
    let transferEvent: TransferEvent | undefined;

    for (const event of events) {
      // Check if this is a Transfer event from STRK contract
      if (
        event.from_address?.toLowerCase() ===
          STRK_CONTRACT_ADDRESS.toLowerCase() &&
        event.keys?.[0]?.toLowerCase() === TRANSFER_EVENT_SELECTOR.toLowerCase()
      ) {
        // Parse Transfer event data
        // Transfer event structure: [selector, from, to, value_low, value_high]
        if (event.data && event.data.length >= 4) {
          const from = event.data[0];
          const to = event.data[1];
          const valueLow = BigInt(event.data[2] || "0");
          const valueHigh = BigInt(event.data[3] || "0");
          const value = valueLow + (valueHigh << 128n);

          transferEvent = {
            from,
            to,
            value,
          };

          // Verify recipient is backend account
          if (to.toLowerCase() !== STARKNET_ACCOUNT_ADDRESS.toLowerCase()) {
            throw new Error(
              `Transfer recipient mismatch. Expected: ${STARKNET_ACCOUNT_ADDRESS}, Got: ${to}`
            );
          }

          // Verify amount matches
          if (value !== expectedAmount) {
            throw new Error(
              `Transfer amount mismatch. Expected: ${expectedAmount}, Got: ${value}`
            );
          }

          // Verify sender if provided
          if (
            senderAddress &&
            from.toLowerCase() !== senderAddress.toLowerCase()
          ) {
            throw new Error(
              `Transfer sender mismatch. Expected: ${senderAddress}, Got: ${from}`
            );
          }

          return { valid: true, transferEvent };
        }
      }
    }

    // If we get here, no valid Transfer event was found
    throw new Error("No valid STRK Transfer event found in transaction");
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to verify transaction: ${String(error)}`);
  }
}

/**
 * Wait for transaction to be confirmed
 * @param txHash - Transaction hash
 * @param maxWaitTime - Maximum time to wait in milliseconds (default: 60000)
 * @returns Transaction receipt
 */
export async function waitForTransactionConfirmation(
  txHash: string,
  maxWaitTime: number = 60000
): Promise<any> {
  const provider = getProvider();

  try {
    const receipt = await provider.waitForTransaction(txHash, {
      retryInterval: 2000,
    });
    if (receipt.statusReceipt === "SUCCEEDED") {
      return receipt;
    }
  } catch (error) {
    console.log("🚀 ~ waitForTransactionConfirmation ~ error:", error);
    // Transaction not found yet, continue waiting
  }
  await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry

  throw new Error(`Transaction not confirmed within ${maxWaitTime}ms`);
}
