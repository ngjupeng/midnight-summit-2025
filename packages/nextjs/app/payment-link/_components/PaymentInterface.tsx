"use client";

import { useState, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { Address } from "~~/components/scaffold-stark";
import { Balance } from "~~/components/scaffold-stark";
import useScaffoldStrkBalance from "~~/hooks/scaffold-stark/useScaffoldStrkBalance";
import { usePayment, PaymentMethod } from "./usePayment";
import { checkBalance } from "~~/services/swap/swapApi";
import { notification } from "~~/utils/scaffold-stark";

interface PaymentInterfaceProps {
  amount: string;
  recipientAddress: string;
}

export default function PaymentInterface({
  amount,
  recipientAddress,
}: PaymentInterfaceProps) {
  const { address } = useAccount();
  const { value: strkBalance, formatted: strkFormatted } =
    useScaffoldStrkBalance({ address });
  const { pay, isLoading, error, txHash, midnightTxId, paymentStatus } =
    usePayment();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null
  );
  const [midnightBalance, setMidnightBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const handlePayment = async (method: PaymentMethod) => {
    if (!amount || !recipientAddress) {
      notification.error("Invalid payment details");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notification.error("Invalid amount");
      return;
    }

    // For STRK payment, check STRK balance
    if (
      method === "strk" &&
      strkBalance &&
      BigInt(Math.floor(amountNum * 1e18)) > strkBalance
    ) {
      notification.error("Insufficient STRK balance");
      return;
    }

    // For tDUST payment, check tDUST balance
    if (method === "tdust" && midnightBalance) {
      const tdustBalanceNum = parseFloat(midnightBalance);
      if (amountNum > tdustBalanceNum) {
        notification.error("Insufficient tDUST balance");
        return;
      }
    }

    await pay(amount, recipientAddress, method);
  };

  const canPay = (method: PaymentMethod) => {
    if (!amount || parseFloat(amount) <= 0 || isLoading) {
      return false;
    }

    const amountNum = parseFloat(amount);

    // For STRK payment, check STRK balance
    if (method === "strk" && strkBalance) {
      return BigInt(Math.floor(amountNum * 1e18)) <= strkBalance;
    }

    // For tDUST payment, check tDUST balance
    if (method === "tdust" && midnightBalance) {
      return amountNum <= parseFloat(midnightBalance);
    }

    // If we don't have balance info, allow the payment (backend will validate)
    return true;
  };

  const getMidnightAddressBalance = async () => {
    const WALLET_SEED_KEY = "midnight-wallet-seed";
    const seed = localStorage
      .getItem(WALLET_SEED_KEY)
      ?.replace(/^"(.*)"$/, "$1");

    if (!seed) {
      return;
    }

    setIsLoadingBalance(true);
    try {
      const response = await checkBalance(seed);

      if (!response.success) {
        throw new Error(response.error || "Failed to check balance");
      }

      if (response.formattedBalance) {
        setMidnightBalance(response.formattedBalance);
      }
    } catch (error) {
      console.error("Failed to check balance:", error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    getMidnightAddressBalance();
  }, []);

  return (
    <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">Payment Request</h2>

        {/* Payment Details */}
        <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)] text-white mb-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white">Amount:</span>
              <span className="font-bold text-lg">{amount} tDUST</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white">Recipient:</span>
              <span className="font-mono text-sm break-all">
                {recipientAddress}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        {paymentMethod === null && (
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Choose Payment Method</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                className="btn bg-white text-black btn-secondary btn-lg h-auto py-6 flex-col"
                onClick={() => setPaymentMethod("strk")}
                disabled={!address || !canPay("strk")}
              >
                <div className="text-2xl mb-2">💎</div>
                <div className="font-bold">Pay with STRK</div>
                {address && (
                  <div className="text-sm opacity-80 mt-1">
                    Balance: {strkFormatted} STRK
                  </div>
                )}
              </button>
              <button
                className="btn bg-white text-black btn-secondary btn-lg h-auto py-6 flex-col"
                onClick={() => setPaymentMethod("tdust")}
                disabled={!canPay("tdust")}
              >
                <div className="text-2xl mb-2">🪙</div>
                <div className="font-bold">Pay with tDUST</div>
                {midnightBalance !== null && (
                  <div className="text-sm opacity-80 mt-1">
                    {isLoadingBalance ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      `Balance: ${midnightBalance} tDUST`
                    )}
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Payment Confirmation */}
        {paymentMethod !== null && (
          <div className="space-y-4">
            <div className="alert alert-info text-white bg-black/60">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="stroke-current shrink-0 w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <div className="font-bold">
                  Payment Method: {paymentMethod === "strk" ? "STRK" : "tDUST"}
                </div>
                <div className="text-sm">
                  {paymentMethod === "strk"
                    ? "Your STRK will be swapped to tDUST and sent to the recipient."
                    : "You will send tDUST directly to the recipient."}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="text-white btn btn-outline flex-1"
                onClick={() => setPaymentMethod(null)}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className={`text-black btn bg-white btn-primary flex-1`}
                onClick={() => handlePayment(paymentMethod)}
                disabled={!canPay(paymentMethod) || !address}
              >
                {isLoading ? (
                  <>
                    <span className="loading loading-spinner text-white"></span>
                    Processing...
                  </>
                ) : (
                  `Confirm Payment`
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Status Display */}
        {paymentStatus !== "idle" &&
          paymentStatus !== "error" &&
          paymentStatus !== "success" && (
            <div className="alert alert-info mt-4">
              <span className="loading loading-spinner loading-sm"></span>
              <span>
                {paymentStatus === "sending-strk" &&
                  "Sending STRK transaction..."}
                {paymentStatus === "sending-tdust" &&
                  "Waiting for tDUST transaction..."}
                {paymentStatus === "verifying" &&
                  "Verifying transaction and processing payment..."}
              </span>
            </div>
          )}

        {/* Transaction Hashes */}
        {paymentStatus === "success" && (
          <div className="space-y-2 mt-4">
            {txHash && (
              <div className="alert alert-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <div className="font-bold">STRK Transaction Hash:</div>
                  <div className="text-xs break-all">{txHash}</div>
                </div>
              </div>
            )}
            {midnightTxId && (
              <div className="alert alert-success">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <div className="font-bold">Midnight Transaction ID:</div>
                  <div className="text-xs break-all">{midnightTxId}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {!address && (
          <div className="alert alert-warning mt-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>Please connect your wallet to make a payment</span>
          </div>
        )}
      </div>
    </div>
  );
}
