import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <Image
        src="/rovers-logo.png"
        alt="Rovers Cricket Tournament"
        width={512}
        height={180}
        priority
        quality={100}
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
      
      <h1 className="font-display text-6xl text-cream mt-4">Live Auction</h1>

      <div className="mt-8 w-full space-y-3">
        <Link
          href="/guest"
          className="block rounded-xl border border-pitch-line bg-pitch-surface px-5 py-4 font-display text-2xl hover:border-grass transition-colors"
        >
          Watch as a guest
        </Link>
        <Link
          href="/rules"
          className="block rounded-xl border border-pitch-line px-5 py-3 text-sm text-cream/50 hover:text-cream transition-colors"
        >
          Rules &amp; Regulations
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
