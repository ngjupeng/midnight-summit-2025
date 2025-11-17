import { getMetadata } from "~~/utils/scaffold-stark/getMetadata";
import SwapInterface from "./_components/SwapInterface";

export const metadata = getMetadata({
  title: "Swap STRK ↔ tDUST",
  description: "Exchange STRK (Starknet) for tDUST (Midnight) at a 1:1 rate",
});

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            Bridge
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            Bridge STRK to TDust
          </h1>
        </header>

        <section className="rounded-3xl border border-white/15 bg-black/70 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <SwapInterface />
        </section>
      </div>
    </div>
  );
}
