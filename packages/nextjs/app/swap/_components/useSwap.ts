import { useState, useCallback } from "react";
import { useAccount } from "@starknet-react/core";
import { useTransactor } from "~~/hooks/scaffold-stark";
import { useDeployedContractInfo } from "~~/hooks/scaffold-stark";
import { initiateSwap, SwapRequest } from "~~/services/swap/swapApi";
import { notification } from "~~/utils/scaffold-stark";

export type SwapDirection = "strk-to-tdust" | "tdust-to-strk";

export interface UseSwapReturn {
  swap: (amount: string, midnightAddress: string, direction: SwapDirection) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  midnightTxId: string | null;
  swapStatus: "idle" | "sending-strk" | "sending-tdust" | "verifying" | "success" | "error";
}

export function useSwap(): UseSwapReturn {
  const { account, address } = useAccount();
  const { writeTransaction } = useTransactor();
  const { data: strkContract } = useDeployedContractInfo("Strk");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [midnightTxId, setMidnightTxId] = useState<string | null>(null);
  const [swapStatus, setSwapStatus] = useState<UseSwapReturn["swapStatus"]>("idle");

  const swap = useCallback(
    async (amount: string, midnightAddress: string, direction: SwapDirection) => {
      if (!account || !address) {
        setError("Please connect your wallet");
        notification.error("Please connect your wallet");
        return;
      }

      if (!strkContract) {
        setError("STRK contract not found");
        notification.error("STRK contract not found");
        return;
      }

      // Support both directions

      setIsLoading(true);
      setError(null);
      setTxHash(null);
      setMidnightTxId(null);

      try {
        if (direction === "strk-to-tdust") {
          // STRK to tDUST: Send STRK transaction first, then call backend
          setSwapStatus("sending-strk");

          // Get backend Starknet address from environment
          // This should be set in .env.local as NEXT_PUBLIC_BACKEND_STARKNET_ADDRESS
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
          setSwapStatus("verifying");

          // Wait a bit for transaction to be included
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Call backend swap API
          const swapRequest: SwapRequest = {
            txHash: hash,
            amount: amount,
            midnightAddress: midnightAddress,
            direction: direction,
            senderAddress: address,
          };

          const swapResponse = await initiateSwap(swapRequest);

          if (!swapResponse.success) {
            throw new Error(swapResponse.error || "Swap failed");
          }

          setMidnightTxId(swapResponse.midnightTxId || null);
          setSwapStatus("success");
          notification.success(
            `Swap completed! Midnight transaction ID: ${swapResponse.midnightTxId}`,
          );
        } else if (direction === "tdust-to-strk") {
          // tDUST to STRK: Call backend first, backend waits for tDUST transaction
          setSwapStatus("sending-tdust");

          // For tDUST to STRK, we don't have a transaction hash yet
          // The backend will generate one when it sends STRK back
          const swapRequest: SwapRequest = {
            txHash: "", // Will be filled by backend when STRK is sent
            amount: amount,
            midnightAddress: midnightAddress,
            direction: direction,
            senderAddress: address,
          };

          const swapResponse = await initiateSwap(swapRequest);

          if (!swapResponse.success) {
            throw new Error(swapResponse.error || "Swap failed");
          }

          setTxHash(swapResponse.strkTxHash || null);
          setMidnightTxId(swapResponse.midnightTxId || null);
          setSwapStatus("success");
          notification.success(
            `Swap completed! STRK transaction hash: ${swapResponse.strkTxHash}`,
          );
        } else {
          throw new Error("Invalid swap direction");
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Swap failed";
        setError(errorMessage);
        setSwapStatus("error");
        notification.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [account, address, strkContract, writeTransaction],
  );

  return {
    swap,
    isLoading,
    error,
    txHash,
    midnightTxId,
    swapStatus,
  };
}

