import type { Metadata } from "next";

import { PublicRequirementForm } from "@/components/public-requirement-form";

export const metadata: Metadata = {
  title: "Submit a property requirement — CDG Leisure",
  description:
    "Tell us what you're looking for and a CDG Leisure agent will be in touch with matching opportunities.",
};

export default function SubmitRequirementPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <header className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          CDG Leisure
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">
          Submit a property requirement
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Looking for your next site? Tell us what you need — location, size,
          budget — and one of our agents will come back to you with matching
          opportunities from our current instructions and wider market
          intelligence.
        </p>
      </header>
      <div className="rounded-lg border bg-card p-5 sm:p-7">
        <PublicRequirementForm />
      </div>
    </main>
  );
}
