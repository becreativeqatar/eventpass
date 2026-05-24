import Image from 'next/image';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f3f0]">
      <div className="w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-10">
          <Image src="/images/bce-logo.webp" alt="BCE" width={180} height={54} className="h-16 w-auto object-contain" priority />
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 text-center">
          <div className="mb-4">
            <span className="text-6xl font-bold bg-gradient-to-r from-[#e0251c] to-[#8232a7] bg-clip-text text-transparent">
              404
            </span>
          </div>
          <h1 className="text-xl font-bold mb-2">Page Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link
            href="/admin"
            className="inline-block w-full bg-gradient-to-r from-[#e0251c] to-[#8232a7] text-white font-semibold text-sm tracking-wide rounded-xl py-3 hover:opacity-90 transition-opacity"
          >
            Back to Dashboard
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Powered by <span className="font-semibold">b.creative events</span>
        </p>
      </div>
    </div>
  );
}
