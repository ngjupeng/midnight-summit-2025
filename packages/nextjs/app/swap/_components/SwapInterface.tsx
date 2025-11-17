"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { useAccount } from "@starknet-react/core";
import { StarkInput } from "~~/components/scaffold-stark/Input/StarkInput";
import { InputBase } from "~~/components/scaffold-stark";
import useScaffoldStrkBalance from "~~/hooks/scaffold-stark/useScaffoldStrkBalance";
import { useSwap, SwapDirection } from "./useSwap";
import { checkBalance } from "~~/services/swap/swapApi";
import { notification } from "~~/utils/scaffold-stark";

const buttonBase =
  "w-full rounded-2xl border border-white/20 px-4 py-3 text-sm font-semibold uppercase tracking-wide transition disabled:opacity-40 disabled:cursor-not-allowed";
const solidButton = `${buttonBase} bg-white text-black hover:bg-white/80`;
const ghostButton = `${buttonBase} text-white hover:bg-white/10`;

export default function SwapInterface() {
  const { address } = useAccount();
  const { value: strkBalance, formatted: strkFormatted } =
    useScaffoldStrkBalance({ address });
  const { swap, isLoading, error, txHash, midnightTxId, swapStatus } =
    useSwap();

  const [amount, setAmount] = useState("");
  const [midnightAddress, setMidnightAddress] = useState(
    (
      typeof window !== "undefined" &&
      localStorage.getItem("midnight-wallet-address")
    )?.replace(/^"(.*)"$/, "$1") ?? ""
  );
  const [direction, setDirection] = useState<SwapDirection>("strk-to-tdust");
  const [midnightBalance, setMidnightBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const isStrkToTdust = direction === "strk-to-tdust";

  const handleSwap = async () => {
    if (!amount || !midnightAddress) return;

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (
      isStrkToTdust &&
      strkBalance &&
      BigInt(Math.floor(amountNum * 1e18)) > strkBalance
    )
      return;

    if (!isStrkToTdust && midnightBalance) {
      const tdustBalanceNum = parseFloat(midnightBalance);
      if (amountNum > tdustBalanceNum) return;
    }

    await swap(amount, midnightAddress, direction);
  };

  const canSwap = (() => {
    if (!amount || !midnightAddress || isLoading || parseFloat(amount) <= 0)
      return false;

    const amountNum = parseFloat(amount);

    if (isStrkToTdust && strkBalance) {
      return BigInt(Math.floor(amountNum * 1e18)) <= strkBalance;
    }

    if (!isStrkToTdust && midnightBalance) {
      return amountNum <= parseFloat(midnightBalance);
    }

    return true;
  })();

  const getMidnightAddressBalance = async () => {
    const seed =
      (
        typeof window !== "undefined" &&
        localStorage.getItem("midnight-wallet-seed")
      )?.replace(/^"(.*)"$/, "$1") ?? null;

    if (!seed) {
      notification.error(
        "No wallet seed found. Please generate a wallet first."
      );
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
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to check balance";
      notification.error(errorMessage);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    if (midnightAddress) {
      getMidnightAddressBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusMessage = useMemo(() => {
    if (swapStatus === "sending-strk") return "Sending STRK transaction...";
    if (swapStatus === "sending-tdust")
      return "Waiting for tDUST transaction...";
    if (swapStatus === "verifying")
      return "Verifying transaction and processing swap...";
    return null;
  }, [swapStatus]);

  return (
    <div className="space-y-10 text-white">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">Flow</p>

        <p className="text-sm text-white/70">
          {isStrkToTdust
            ? "Bridge value from Starknet to your Midnight wallet."
            : "Redeem tDUST back to Starknet using your connected wallet."}
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Amount ({isStrkToTdust ? "STRK" : "tDUST"})</span>
            {isStrkToTdust && address && (
              <span>Balance: {strkFormatted} STRK</span>
            )}
            {!isStrkToTdust && midnightAddress && (
              <span>
                Balance:{" "}
                {isLoadingBalance ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  `${midnightBalance ?? "—"} tDUST`
                )}
              </span>
            )}
          </div>
          <StarkInput
            value={amount}
            onChange={setAmount}
            placeholder={`Enter amount in ${isStrkToTdust ? "STRK" : "tDUST"}`}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
            <span>Midnight address</span>
            {midnightAddress && (
              <span>
                {isLoadingBalance ? (
                  <span className="loading loading-spinner loading-xs"></span>
                ) : (
                  `Balance: ${midnightBalance ?? "—"} tDUST`
                )}
              </span>
            )}
          </div>
          <InputBase
            value={midnightAddress}
            onChange={setMidnightAddress}
            placeholder="mn_shield..."
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">
            Connected Starknet wallet
          </p>
          <div className="rounded-2xl border border-white/15 bg-black/40 p-4 font-mono text-sm text-white/80">
            {address ?? "Connect your Starknet wallet"}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-white/30 bg-white/5 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {statusMessage && (
        <div className="rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-white/80">
          <span className="loading loading-spinner loading-xs mr-2"></span>
          {statusMessage}
        </div>
      )}

      {swapStatus === "success" && (
        <div className="space-y-3 rounded-2xl border border-white/20 bg-white/5 p-4 text-xs">
          {txHash && (
            <div>
              <p className="font-semibold text-white">STRK transaction hash</p>
              <p className="break-all text-white/70">{txHash}</p>
            </div>
          )}
          {midnightTxId && (
            <div>
              <p className="font-semibold text-white">
                Midnight transaction ID
              </p>
              <p className="break-all text-white/70">{midnightTxId}</p>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <button
          className={`${solidButton} flex items-center justify-center gap-2`}
          onClick={handleSwap}
          disabled={!canSwap || !address}
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner loading-xs"></span>
              Processing
            </>
          ) : (
            <>
              <ArrowsRightLeftIcon className="h-5 w-5" />
              Swap {isStrkToTdust ? "STRK → tDUST" : "tDUST → STRK"}
            </>
          )}
        </button>
        {!address && (
          <p className="text-xs uppercase tracking-[0.3em] text-red-300">
            Connect Starknet wallet to continue
          </p>
        )}
      </div>
    </div>
  );
}
