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
        className="mb-6 h-auto w-64 max-w-full"
      />

      <h1 className="font-display text-5xl text-cream mb-2">Rovers Cricket 2026</h1>
      <br />
      
      <div className="w-full space-y-3">
        <Link
          href="/schedule"
          className="block rounded-xl border border-grass/50 bg-grass/10 px-5 py-4 font-display text-2xl text-grass hover:bg-grass/20 transition-colors"
        >
          Schedule and Live Scores
        </Link>
        <Link
          href="/results"
          className="block rounded-xl border border-gold/50 bg-gold/10 px-5 py-4 font-display text-2xl text-gold hover:bg-gold/20 transition-colors"
        >
          Teams and Squads
        </Link>
        <Link
          href="/rules"
          className="block rounded-xl border border-pitch-line bg-pitch-surface px-5 py-3 text-sm text-cream/60 hover:text-cream transition-colors"
        >
          Rules &amp; Regulations
        </Link>
      </div>
    </div>
  );
}
