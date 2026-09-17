import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <img
        src="/rovers-logo.png"
        alt="Rovers Cricket Tournament"
        className="mb-5 h-auto w-64 max-w-full"
      />
      <a
        href="https://foggpk.com"
        target="_blank"
        rel="noreferrer"
        className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wide text-cream/40 hover:text-cream transition-colors"
      >
        <span>Powered by</span>
        <img
          src="/Fogg%20Golden%20Logo.png"
          alt="Sponsor logo"
          className="h-8 w-auto max-w-32 object-contain"
        />
      </a>
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
