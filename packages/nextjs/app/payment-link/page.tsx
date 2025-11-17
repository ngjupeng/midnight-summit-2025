"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import PaymentInterface from "./_components/PaymentInterface";
import CreatePaymentLink from "./_components/CreatePaymentLink";

const PageShell = ({
  subtitle,
  children,
}: {
  subtitle?: string | null;
  children: ReactNode;
}) => (
  <div className="min-h-screen bg-black text-white">
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
      <header className="rounded-3xl border border-white/20 bg-black/60 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.35)]">
        <p className="text-xs uppercase tracking-[0.4em] text-white/60">
          Midnight Commerce
        </p>
        <h1 className="mt-2 text-3xl font-semibold leading-tight">
          Payment Links
        </h1>
      </header>
      <section className="rounded-3xl border border-white/15 bg-black/70 p-8 shadow-[0_25px_45px_rgba(0,0,0,0.55)] backdrop-blur-md">
        {children}
      </section>
    </div>
  </div>
);

function PaymentLinkContent() {
  const searchParams = useSearchParams();
  const amount = searchParams.get("amount");
  const recipient = searchParams.get("recipient");

  const render = (subtitle: string | null, content: ReactNode) => (
    <PageShell subtitle={subtitle}>{content}</PageShell>
  );

  if (!amount || !recipient) {
    return render(
      "Generate branded links to receive MDN while letting payers use STRK or tDUST.",
      <CreatePaymentLink />
    );
  }

  const amountNum = parseFloat(amount);
  if (isNaN(amountNum) || amountNum <= 0) {
    return render(
      "Double-check the amount you received in the URL parameters.",
      <div className="rounded-2xl border border-white/20 bg-white/5 p-6 text-sm text-red-200">
        Invalid amount supplied. Received:{" "}
        <span className="font-mono">{amount}</span>
      </div>
    );
  }

  return render(
    "Complete the request below using STRK or tDUST—the recipient always settles in Midnight.",
    <PaymentInterface amount={amount} recipientAddress={recipient} />
  );
}

export default function PaymentLinkPage() {
  return (
    <Suspense
      fallback={
        <PageShell subtitle="Loading payment link details...">
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-lg text-white"></span>
          </div>
        </PageShell>
      }
    >
      <PaymentLinkContent />
    </Suspense>
  );
}
