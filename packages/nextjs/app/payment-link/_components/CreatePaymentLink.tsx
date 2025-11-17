"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { InputBase } from "~~/components/scaffold-stark";
import { notification } from "~~/utils/scaffold-stark";

export default function CreatePaymentLink() {
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [isWalletChecked, setIsWalletChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedAddress =
      localStorage
        .getItem("midnight-wallet-address")
        ?.replace(/^"(.*)"$/, "$1") ?? "";
    const storedSeed =
      localStorage.getItem("midnight-wallet-seed")?.replace(/^"(.*)"$/, "$1") ??
      "";
    setRecipientAddress(storedAddress);
    setHasWallet(Boolean(storedAddress && storedSeed));
    setIsWalletChecked(true);
  }, []);

  const generatePaymentLink = () => {
    if (!hasWallet) {
      notification.error(
        "Generate a Midnight wallet before creating payment links."
      );
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    // Validate recipient address
    if (!recipientAddress || recipientAddress.trim() === "") {
      notification.error("Please enter a Midnight address");
      return;
    }

    // Validate Midnight address format (basic check - should start with 'mn_shield')
    if (!recipientAddress.startsWith("mn_shield")) {
      notification.error(
        "Please enter a valid Midnight address (should start with 'mn_shield')"
      );
      return;
    }

    // Generate payment link
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/payment-link?amount=${encodeURIComponent(amount)}&recipient=${encodeURIComponent(recipientAddress)}`;
    setPaymentLink(link);
  };

  const copyToClipboard = async () => {
    if (!paymentLink) return;

    try {
      await navigator.clipboard.writeText(paymentLink);
      notification.success("Payment link copied to clipboard!");
    } catch (err) {
      notification.error("Failed to copy link");
    }
  };

  const resetForm = () => {
    setAmount("");
    if (typeof window !== "undefined") {
      const storedAddress =
        localStorage
          .getItem("midnight-wallet-address")
          ?.replace(/^"(.*)"$/, "$1") ?? "";
      setRecipientAddress(storedAddress);
    } else {
      setRecipientAddress("");
    }
    setPaymentLink(null);
  };

  if (!isWalletChecked) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg text-white"></span>
      </div>
    );
  }

  if (!hasWallet) {
    return (
      <div className="rounded-3xl border border-white/20 bg-black/60 p-8 text-white shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
        <h2 className="text-2xl font-semibold">
          Create a Midnight wallet first
        </h2>
        <p className="mt-3 text-sm text-white/70">
          Payment links deposit funds into your embedded Midnight wallet.
          Generate one before sharing any request.
        </p>
        <Link
          href="/midnight-wallet"
          className="mt-6 inline-flex items-center justify-center rounded-full border border-white px-6 py-3 text-sm font-semibold uppercase tracking-wide transition hover:bg-white hover:text-black"
        >
          Generate Wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="card shadow-xl max-w-2xl mx-auto">
      <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
        <h2 className="card-title text-2xl mb-4">Create Payment Link</h2>
        <p className="text-sm text-white mb-6">
          Generate a payment link that others can use to pay you in STRK or
          tDUST. You will receive tDUST regardless of the payment method chosen.
        </p>

        {!paymentLink ? (
          <>
            {/* Amount Input */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text text-white">Amount (tDUST)</span>
              </label>
              <InputBase
                value={amount}
                onChange={setAmount}
                placeholder="Enter amount (e.g., 10)"
              />
            </div>

            {/* Recipient Address Input */}
            <div className="form-control mb-4 text-white">
              <label className="label">
                <span className="label-text">Your Midnight Address</span>
                <span className="label-text-alt">
                  Where you'll receive the payment
                </span>
              </label>
              <InputBase
                value={recipientAddress}
                onChange={setRecipientAddress}
                placeholder="Enter your Midnight address (e.g., mn1...)"
              />
            </div>

            {/* Generate Button */}
            <div className="card-actions justify-end mt-4">
              <button
                className="btn bg-white text-black btn-primary w-full"
                onClick={generatePaymentLink}
                disabled={!amount || !recipientAddress}
              >
                Generate Payment Link
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success Message */}
            <div className="alert alert-success mb-4">
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
                <h3 className="font-bold">Payment Link Generated!</h3>
                <div className="text-sm">
                  Share this link with anyone who needs to pay you.
                </div>
              </div>
            </div>

            {/* Payment Link Display */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Payment Link</span>
              </label>
              <div className="flex gap-2 ">
                <div className="text-white font-mono break-all">
                  {paymentLink}
                </div>
                <button
                  className="bg-white text-black btn btn-primary"
                  onClick={copyToClipboard}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Payment Details Summary */}
            <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)] text-white mb-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white">Amount:</span>
                  <span className="font-bold">{amount} tDUST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white">Recipient:</span>
                  <span className="font-mono text-sm break-all">
                    {recipientAddress}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card-actions justify-end gap-2">
              <button className="btn btn-outline" onClick={resetForm}>
                Create Another
              </button>
              <button
                className="btn bg-white text-black btn-primary"
                onClick={copyToClipboard}
              >
                Copy Link Again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
