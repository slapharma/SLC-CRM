import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <Link href="/" className="mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="CliftonAi-CRM" className="h-10 w-auto" />
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
