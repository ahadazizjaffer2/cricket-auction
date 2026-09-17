import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-wide text-cream/40">Live Auction</p>
      <h1 className="font-display text-6xl text-cream mt-1">Pick your seat</h1>

      <div className="mt-8 w-full space-y-3">
        <Link
          href="/guest"
          className="block rounded-xl border border-pitch-line bg-pitch-surface px-5 py-4 font-display text-2xl hover:border-grass transition-colors"
        >
          Watch as a guest
        </Link>
        <Link
          href="/admin"
          className="block rounded-xl border border-pitch-line px-5 py-3 text-sm text-cream/50 hover:text-cream transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
