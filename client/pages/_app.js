import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen pitch-texture bg-pitch-bg text-cream">
      <Component {...pageProps} />
    </div>
  );
}
