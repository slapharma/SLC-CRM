import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Requirement received — CDG Leisure",
};

export default function ThankYouPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <CheckCircle2 className="h-12 w-12 text-success" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Requirement received
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Thank you — your requirement is with our agency team. One of our agents
        will be in touch as soon as we have matching opportunities for you.
      </p>
    </main>
  );
}
