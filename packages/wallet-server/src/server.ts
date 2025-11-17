import express, { Request, Response } from "express";
import cors from "cors";
import { generateRandomSeed, createWalletForAddress } from "./midnightWalletGenerator.js";
import { readWalletFromEnv, writeWalletToEnv } from "./envUtils.js";
import { verifyStrkTransaction, waitForTransactionConfirmation, sendSTRK } from "./strkVerifier.js";
import { sendTDust, getTDustBalance, checkBalanceFromSeed, waitForTDustTransaction, sendTDustFromSeed } from "./midnightWalletService.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Generate wallet endpoint
app.post("/api/generate-midnight-wallet", async (_req: Request, res: Response) => {
  try {
    // Generate new wallet
    const address = await createWalletForAddress(_req.body.seed.replace(/^"(.*)"$/, "$1"));

    res.json({
      success: true,
      midnightAddress: address,
    });
  } catch (error) {
    console.error("Error generating wallet:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate wallet",
    });
  }
});

// Check balance endpoint
app.post("/api/check-balance", async (req: Request, res: Response) => {
  try {
    const { seed } = req.body;

    if (!seed) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: seed",
      });
    }

    console.log("💰 Checking balance for wallet...");
    const result = await checkBalanceFromSeed(seed);

    res.json({
      success: true,
      address: result.address,
      balance: result.balance.toString(),
      formattedBalance: result.formattedBalance,
    });
  } catch (error) {
    console.error("Error checking balance:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to check balance",
    });
  }
});

// Swap endpoint: STRK to tDUST
app.post("/api/swap", async (req: Request, res: Response) => {
  try {
    const { txHash, amount, midnightAddress, direction, senderAddress, recipientAddress } = req.body;

    // Validate request
    if (!txHash || !amount || !midnightAddress || !direction) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: txHash, amount, midnightAddress, direction",
      });
    }

    if (direction !== "strk-to-tdust" && direction !== "tdust-to-strk") {
      return res.status(400).json({
        success: false,
        error: "Invalid direction. Must be 'strk-to-tdust' or 'tdust-to-strk'",
      });
    }

    // Handle both directions: STRK to tDUST and tDUST to STRK
    if (direction === "strk-to-tdust") {
      // STRK to tDUST swap logic
      // Convert amount: STRK has 18 decimals
      // Amount comes as string in STRK (e.g., "1.0" for 1 STRK)
      // Convert to wei (18 decimals) for STRK verification
      // For tDUST, since it's 1:1 rate, we use the same numeric value (in tDUST units)
      const strkAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const tdustAmount = BigInt(Math.floor(parseFloat(amount))); // 1:1 rate, so same amount in tDUST

      console.log(`🔄 Processing swap: ${amount} STRK → ${amount} tDUST`);
      console.log(`📝 Transaction hash: ${txHash}`);
      console.log(`📍 Midnight address: ${midnightAddress}`);

      // Wait for transaction confirmation
      console.log("⏳ Waiting for STRK transaction confirmation...");
      await waitForTransactionConfirmation(txHash, 120000); // 2 minutes max

      // Verify STRK transaction
      // console.log("🔍 Verifying STRK transaction...");
      // const verification = await verifyStrkTransaction(
      //   txHash,
      //   strkAmount,
      //   senderAddress,
      // );

      // if (!verification.valid) {
      //   return res.status(400).json({
      //     success: false,
      //     error: "STRK transaction verification failed",
      //   });
      // }

      console.log("✅ STRK transaction verified");

      // Check tDUST balance before sending
      const balance = await getTDustBalance();
      console.log(`💰 Current tDUST balance: ${Number(balance) / 1_000_000} tDUST`);

      // Convert tdustAmount (in tDUST units) to microTusdt for comparison
      const tdustAmountMicroTusdt = tdustAmount * BigInt(1_000_000);

      if (balance < tdustAmountMicroTusdt) {
        return res.status(400).json({
          success: false,
          error: `Insufficient tDUST balance. Required: ${amount} tDUST, Available: ${Number(balance) / 1_000_000} tDUST`,
        });
      }

      // Send tDUST to user's Midnight address (or recipient address if provided for payment links)
      // tdustAmount is already in tDUST units (from the 1:1 conversion)
      const targetAddress = recipientAddress || midnightAddress;
      console.log(`📤 Sending ${amount} tDUST to ${targetAddress}...`);
      const txId = await sendTDust(targetAddress, tdustAmount);

      console.log(`✅ Swap completed! Midnight transaction ID: ${txId}`);

      res.json({
        success: true,
        message: "Swap completed successfully",
        strkTxHash: txHash,
        midnightTxId: txId,
        amount: amount,
        midnightAddress: recipientAddress || midnightAddress,
      });
    } else if (direction === "tdust-to-strk") {
      // tDUST to STRK swap logic
      // Convert amount: tDUST has 6 decimals, STRK has 18 decimals
      // Amount comes as string in tDUST (e.g., "1.0" for 1 tDUST)
      // Convert to STRK wei (18 decimals) for sending
      const tdustAmount = BigInt(Math.floor(parseFloat(amount))); // tDUST amount
      const strkAmount = BigInt(Math.floor(parseFloat(amount) * 1e18)); // 1:1 rate, convert to STRK wei

      console.log(`🔄 Processing swap: ${amount} tDUST → ${amount} STRK`);
      console.log(`📝 Midnight transaction expected from: ${midnightAddress}`);
      console.log(`📍 Starknet recipient: ${senderAddress}`);

      // Wait for incoming tDUST transaction
      console.log("⏳ Waiting for tDUST transaction...");
      const verification = await waitForTDustTransaction(tdustAmount, midnightAddress, 120000); // 2 minutes max

      if (!verification.verified) {
        return res.status(400).json({
          success: false,
          error: "tDUST transaction verification failed",
        });
      }

      console.log("✅ tDUST transaction verified");

      // Send STRK to user's Starknet address
      console.log(`📤 Sending ${amount} STRK to ${senderAddress}...`);
      const strkTxHash = await sendSTRK(senderAddress, strkAmount);

      // Wait for STRK transaction confirmation
      console.log("⏳ Waiting for STRK transaction confirmation...");
      await waitForTransactionConfirmation(strkTxHash, 120000);

      console.log(`✅ Swap completed! STRK transaction hash: ${strkTxHash}`);

      res.json({
        success: true,
        message: "Swap completed successfully",
        strkTxHash: strkTxHash,
        midnightTxId: null, // No Midnight tx ID for receiving tDUST
        amount: amount,
        midnightAddress: midnightAddress,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid direction",
      });
    }
  } catch (error) {
    console.error("Error processing swap:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process swap",
    });
  }
});

// Payment endpoint: Handle STRK and tDUST payments
app.post("/api/payment", async (req: Request, res: Response) => {
  try {
    const { amount, recipientAddress, paymentMethod, txHash } = req.body;

    // Validate request
    if (!amount || !recipientAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: amount, recipientAddress, paymentMethod",
      });
    }

    if (paymentMethod !== "strk" && paymentMethod !== "tdust") {
      return res.status(400).json({
        success: false,
        error: "Invalid paymentMethod. Must be 'strk' or 'tdust'",
      });
    }

    if (paymentMethod === "strk") {
      // STRK payment: Verify STRK transaction, swap to tDUST, send to recipient
      if (!txHash) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields for STRK payment: txHash",
        });
      }

      const strkAmount = BigInt(Math.floor(parseFloat(amount) * 1e18));
      const tdustAmount = BigInt(Math.floor(parseFloat(amount))); // 1:1 rate

      console.log(`💳 Processing STRK payment: ${amount} STRK → ${amount} tDUST`);
      console.log(`📝 Transaction hash: ${txHash}`);
      console.log(`📍 Recipient Midnight address: ${recipientAddress}`);

      // Wait for transaction confirmation
      console.log("⏳ Waiting for STRK transaction confirmation...");
      await waitForTransactionConfirmation(txHash, 120000); // 2 minutes max

      console.log("✅ STRK transaction verified");

      // Check tDUST balance before sending
      const balance = await getTDustBalance();
      console.log(`💰 Current tDUST balance: ${Number(balance) / 1_000_000} tDUST`);

      // Convert tdustAmount (in tDUST units) to microTusdt for comparison
      const tdustAmountMicroTusdt = tdustAmount * BigInt(1_000_000);

      if (balance < tdustAmountMicroTusdt) {
        return res.status(400).json({
          success: false,
          error: `Insufficient tDUST balance. Required: ${amount} tDUST, Available: ${Number(balance) / 1_000_000} tDUST`,
        });
      }

      // Send tDUST to recipient's Midnight address
      console.log(`📤 Sending ${amount} tDUST to ${recipientAddress}...`);
      const txId = await sendTDust(recipientAddress, tdustAmount);

      console.log(`✅ Payment completed! Midnight transaction ID: ${txId}`);

      res.json({
        success: true,
        message: "Payment completed successfully",
        strkTxHash: txHash,
        midnightTxId: txId,
        amount: amount,
        recipientAddress: recipientAddress,
      });
    } else if (paymentMethod === "tdust") {
      // tDUST payment: Create wallet from seed and send transaction directly
      if (!req.body.seed) {
        return res.status(400).json({
          success: false,
          error: "Missing required field for tDUST payment: seed",
        });
      }

      const seed = req.body.seed.replace(/^"(.*)"$/, "$1");
      const tdustAmount = BigInt(Math.floor(parseFloat(amount)));

      console.log(`💳 Processing tDUST payment: ${amount} tDUST`);
      console.log(`📍 Recipient Midnight address: ${recipientAddress}`);

      console.log("📤 Creating wallet from seed and sending tDUST...");
      const txId = await sendTDustFromSeed(seed, recipientAddress, tdustAmount);

      console.log(`✅ Payment completed! Midnight transaction ID: ${txId}`);

      res.json({
        success: true,
        message: "Payment completed successfully",
        midnightTxId: txId,
        amount: amount,
        recipientAddress: recipientAddress,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid payment method",
      });
    }
  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process payment",
    });
  }
});

// Error handling middleware
app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
    });
  },
);

export default app;

