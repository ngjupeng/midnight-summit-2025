import { useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { useTransactor } from "~~/hooks/scaffold-stark";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark";
import { processPayment, PaymentRequest } from "~~/services/swap/swapApi";
import { notification } from "~~/utils/scaffold-stark";

export type PaymentMethod = "strk" | "tdust";

export interface UsePaymentReturn {
  pay: (amount: string, recipientAddress: string, paymentMethod: PaymentMethod) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  midnightTxId: string | null;
  paymentStatus: "idle" | "sending-strk" | "sending-tdust" | "verifying" | "success" | "error";
}

export function usePayment(): UsePaymentReturn {
  const { account, address } = useAccount();
  const { writeTransaction } = useTransactor();
  const { data: strkContract } = useDeployedContractInfo("Strk");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [midnightTxId, setMidnightTxId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<UsePaymentReturn["paymentStatus"]>("idle");

  const pay = useCallback(
    async (amount: string, recipientAddress: string, paymentMethod: PaymentMethod) => {
      if (!account || !address) {
        setError("Please connect your wallet");
        notification.error("Please connect your wallet");
        return;
      }

      setIsLoading(true);
      setError(null);
      setTxHash(null);
      setMidnightTxId(null);

      try {
        if (paymentMethod === "strk") {
          // STRK payment: Send STRK transaction first, then call backend to swap and forward to recipient
          if (!strkContract) {
            throw new Error("STRK contract not found");
          }

          setPaymentStatus("sending-strk");

          // Get backend Starknet address from environment
          const backendAddress = process.env.NEXT_PUBLIC_BACKEND_STARKNET_ADDRESS;
          if (!backendAddress) {
            throw new Error(
              "Backend Starknet address not configured. Please set NEXT_PUBLIC_BACKEND_STARKNET_ADDRESS in your environment variables.",
            );
          }

          // Convert amount to wei (STRK has 18 decimals)
          const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));

          // Split u256 into low and high parts
          const amountLow = amountWei & BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF");
          const amountHigh = amountWei >> 128n;

          // Prepare transfer call
          const calls = [
            {
              contractAddress: strkContract.address,
              entrypoint: "approve",
              calldata: [
                backendAddress, // recipient (backend address)
                amountLow.toString(), // amount low
                amountHigh.toString(), // amount high
              ],
            },
            {
              contractAddress: strkContract.address,
              entrypoint: "transfer",
              calldata: [
                backendAddress, // recipient (backend address)
                amountLow.toString(), // amount low
                amountHigh.toString(), // amount high
              ],
            },
          ];

          // Send STRK transaction
          const hash = await writeTransaction(calls);

          if (!hash) {
            throw new Error("Transaction failed");
          }

          setTxHash(hash);
          setPaymentStatus("verifying");

          // Wait a bit for transaction to be included
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Call backend payment API
          const paymentRequest: PaymentRequest = {
            amount: amount,
            recipientAddress: recipientAddress,
            paymentMethod: "strk",
            txHash: hash,
          };

          const paymentResponse = await processPayment(paymentRequest);

          if (!paymentResponse.success) {
            throw new Error(paymentResponse.error || "Payment failed");
          }

          setMidnightTxId(paymentResponse.midnightTxId || null);
          setPaymentStatus("success");
          notification.success(
            `Payment completed! Midnight transaction ID: ${paymentResponse.midnightTxId}`,
          );
        } else if (paymentMethod === "tdust") {
          // tDUST payment: Send seed to backend, backend creates and sends transaction
          setPaymentStatus("sending-tdust");

          // Get user's Midnight wallet seed from localStorage
          const WALLET_SEED_KEY = "midnight-wallet-seed";
          const seed = localStorage.getItem(WALLET_SEED_KEY)?.replace(/^"(.*)"$/, "$1");

          if (!seed) {
            throw new Error("No Midnight wallet found. Please generate a wallet first.");
          }

          // Send seed to backend, backend will create wallet and send transaction
          const paymentRequest: PaymentRequest = {
            amount: amount,
            recipientAddress: recipientAddress,
            paymentMethod: "tdust",
            seed: seed,
          };

          const paymentResponse = await processPayment(paymentRequest);

          if (!paymentResponse.success) {
            throw new Error(paymentResponse.error || "Payment failed");
          }

          setMidnightTxId(paymentResponse.midnightTxId || null);
          setPaymentStatus("success");
          notification.success(
            `Payment completed! Midnight transaction ID: ${paymentResponse.midnightTxId}`,
          );
        } else {
          throw new Error("Invalid payment method");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Payment failed";
        setError(errorMessage);
        setPaymentStatus("error");
        notification.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [account, address, strkContract, writeTransaction],
  );

  return {
    pay,
    isLoading,
    error,
    txHash,
    midnightTxId,
    paymentStatus,
  };
}

