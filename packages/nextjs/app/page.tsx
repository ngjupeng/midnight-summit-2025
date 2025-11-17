"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { CustomConnectButton } from "~~/components/scaffold-stark/CustomConnectButton";
import { checkBalance } from "~~/services/swap/swapApi";
import { notification } from "~~/utils/scaffold-stark";

const WALLET_SEED_KEY = "midnight-wallet-seed";
const WALLET_ADDRESS_KEY = "midnight-wallet-address";

const tabs = [
  {
    key: "swap",
    title: "Swap",
    description: "Swap MDN with supported assets through the on-chain swapper.",
    href: "/swap",
    cta: "Go to Swap",
  },
  {
    key: "payment",
    title: "Payment Link",
    description: "Create branded payment links, share them, and receive MDN.",
    href: "/payment-link",
    cta: "Create Link",
  },
];

const Home = () => {
  const [midnightBalance, setMidnightBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [midnightAddress, setMidnightAddress] = useState(
    (
      typeof window !== "undefined" &&
      localStorage.getItem("midnight-wallet-address")
    )?.replace(/^"(.*)"$/, "$1") ?? ""
  );

  const [seed] = useLocalStorage<string | null>(WALLET_SEED_KEY, null, {
    initializeWithValue: false,
  });
  const [address] = useLocalStorage<string | null>(WALLET_ADDRESS_KEY, null, {
    initializeWithValue: false,
  });
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]["key"]>("swap");

  const truncatedAddress = useMemo(() => {
    if (!address) return "Create your wallet to get started";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const activeSection = useMemo(() => {
    return tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  }, [activeTab]);

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

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="w-full rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">
                Midnight Browser Wallet
              </p>
              <h1 className="text-3xl font-semibold leading-tight">
                Manage your embedded Midnight wallet
              </h1>
              <p className="text-sm text-white/70">
                Generate a Midnight wallet, keep the seed locally, and connect
                your Starknet wallet to interact with the rest of the app.
              </p>
            </div>
            <Link
              href="/midnight-wallet"
              className="w-full rounded-full border border-white px-6 py-3 text-center text-sm font-semibold uppercase tracking-wide transition hover:bg-white hover:text-black lg:w-auto"
            >
              {seed && address ? "Manage Wallet" : "Create Wallet"}
            </Link>
          </div>
        </header>

        <section className="grid w-full gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-white/15 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm tracking-[0.3em] text-white/60">MIDNIGHT</p>
              <span className="text-xs text-white/50">
                {seed ? "Embedded" : "Not created"}
              </span>
            </div>
            <div className="py-6 text-center">
              <div className="text-5xl font-black tracking-widest">
                {midnightAddress && (
                  <span>
                    {isLoadingBalance ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      `${midnightBalance ?? "—"} tDUST`
                    )}
                  </span>
                )}
              </div>
              <p className="mt-3 text-lg font-medium">{truncatedAddress}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Link
                href="/midnight-wallet"
                className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold uppercase tracking-wide hover:bg-white hover:text-black"
              >
                {seed && address ? "View Seed" : "Create"}
              </Link>
              <Link
                href="/midnight-wallet"
                className="rounded-xl border border-white/20 px-4 py-3 text-center font-semibold uppercase tracking-wide hover:bg-white hover:text-black"
              >
                Receive
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm tracking-[0.3em] text-white/60">STARKNET</p>
              <span className="text-xs text-white/50">Connect wallet</span>
            </div>
            <p className="mt-6 text-sm text-white/70">
              Use your Starknet wallet to sign swaps or payment requests.
              Connect here to keep it close to the Midnight wallet.
            </p>
            <div className="mt-8 rounded-2xl border border-dashed border-white/20 p-4 text-black">
              <CustomConnectButton />
            </div>
          </div>
        </section>

        <section className="w-full rounded-3xl border border-white/15">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`flex-1 border-b border-white/15 px-6 py-4 text-left text-lg font-semibold uppercase tracking-wide transition ${
                  activeTab === tab.key
                    ? "bg-white text-black"
                    : "text-white/70 hover:text-white"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.title}
              </button>
            ))}
          </div>
          <div className="space-y-4 px-6 py-8 text-white">
            <h2 className="text-2xl font-semibold">{activeSection.title}</h2>
            <p className="text-white/70">{activeSection.description}</p>
            <Link
              href={activeSection.href}
              className="inline-flex items-center justify-center rounded-full border border-white px-6 py-3 text-sm font-semibold uppercase tracking-wide transition hover:bg-white hover:text-black"
            >
              {activeSection.cta}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
