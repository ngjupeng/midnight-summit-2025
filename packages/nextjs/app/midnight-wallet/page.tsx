import { getMetadata } from "~~/utils/scaffold-stark/getMetadata";
import GenerateWallet from "./_components/GenerateWallet";

export const metadata = getMetadata({
  title: "Midnight Wallet Generator",
  description: "Generate a new Midnight wallet seed and address for testnet",
});

export default function MidnightWalletPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
          <p className="text-xs uppercase tracking-[0.4em] text-white/60">
            Embedded Wallet
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">
            Midnight Wallet Generator
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/70">
            Create a local seed and address for the Midnight testnet. Nothing
            leaves your browser.
          </p>
        </header>

        <section className="rounded-3xl border border-white/15 bg-black/70 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <GenerateWallet />
        </section>
      </div>
    </div>
  );
}
