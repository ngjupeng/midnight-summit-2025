"use client";

import { useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import CopyToClipboard from "react-copy-to-clipboard";
import {
  CheckCircleIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { notification } from "~~/utils/scaffold-stark/notification";

const WALLET_SEED_KEY = "midnight-wallet-seed";
const WALLET_ADDRESS_KEY = "midnight-wallet-address";

export default function GenerateWallet() {
  const [seed, setSeed] = useLocalStorage<string | null>(
    WALLET_SEED_KEY,
    null,
    {
      initializeWithValue: false,
    }
  );
  const [address, setAddress] = useLocalStorage<string | null>(
    WALLET_ADDRESS_KEY,
    null,
    { initializeWithValue: false }
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seedCopied, setSeedCopied] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  /**
   * Generate a cryptographically secure 64-character hex seed phrase
   */
  const generateRandomSeed = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  };

  /**
   * Create wallet instance to get the address using HD Wallet SDK
   * Calls backend to generate wallet and returns both seed and address
   */
  const createWalletForAddress = async (
    seed: string
  ): Promise<string | null> => {
    try {
      const WALLET_API_URL =
        process.env.NEXT_PUBLIC_WALLET_API_URL || "http://localhost:3001";

      const response = await fetch(
        `${WALLET_API_URL}/api/generate-midnight-wallet`,
        {
          method: "POST",
          body: JSON.stringify({ seed }),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      // Return address from server
      return data.midnightAddress || null;
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw error;
    }
  };

  const handleGenerateWallet = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const newSeed = generateRandomSeed();
      setSeed(newSeed);

      const walletAddress = await createWalletForAddress(newSeed);

      if (walletAddress) {
        setAddress(walletAddress);
        notification.success("Wallet generated successfully!");
      } else {
        setAddress(null);
        notification.warning(
          "Seed generated, but could not retrieve address. You can check your address after first deployment."
        );
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate wallet";
      setError(errorMessage);
      notification.error(`Wallet generation failed: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySeed = () => {
    setSeedCopied(true);
    setTimeout(() => {
      setSeedCopied(false);
    }, 800);
  };

  const handleCopyAddress = () => {
    setAddressCopied(true);
    setTimeout(() => {
      setAddressCopied(false);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {!seed && (
        <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-2xl font-bold mb-4">Generate New Wallet</h2>
            <button
              className="btn bg-white text-black btn-primary btn-lg"
              onClick={handleGenerateWallet}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Generating...
                </>
              ) : (
                "Generate Wallet"
              )}
            </button>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {seed && (
        <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <h3 className="text-xl font-bold mb-4">Wallet Seed</h3>
          <div className="bg-black/60 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <code className="text-sm  font-mono break-all">{seed}</code>
              {seedCopied ? (
                <CheckCircleIcon className="ml-4 text-xl text-success h-6 w-6 shrink-0" />
              ) : (
                // @ts-ignore - React 19 type compatibility issue with react-copy-to-clipboard
                <CopyToClipboard text={seed} onCopy={handleCopySeed}>
                  <DocumentDuplicateIcon className="ml-4 text-xl text-sky-600 h-6 w-6 cursor-pointer shrink-0" />
                </CopyToClipboard>
              )}
            </div>
          </div>
          <div className="alert alert-warning">
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
            <span>
              <strong>Important:</strong> Save this seed phrase securely. It
              cannot be recovered if lost. The seed is stored in your browser's
              localStorage.
            </span>
          </div>
        </div>
      )}

      {address && (
        <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <h3 className="text-xl font-bold mb-4">Wallet Address</h3>
          <div className="bg-black/60 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono break-all">{address}</code>
              {addressCopied ? (
                <CheckCircleIcon className="ml-4 text-xl text-success h-6 w-6 shrink-0" />
              ) : (
                // @ts-ignore - React 19 type compatibility issue with react-copy-to-clipboard
                <CopyToClipboard text={address} onCopy={handleCopyAddress}>
                  <DocumentDuplicateIcon className="ml-4 text-xl text-sky-600 h-6 w-6 cursor-pointer shrink-0" />
                </CopyToClipboard>
              )}
            </div>
          </div>
        </div>
      )}

      {seed && (
        <div className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <h3 className="text-xl font-bold mb-4">Storage Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Seed stored in localStorage:</span>
              <span className="badge badge-success">Saved</span>
            </div>
            {address && (
              <div className="flex items-center justify-between">
                <span>Address stored in localStorage:</span>
                <span className="badge badge-success">Saved</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
