'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Camera, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import Link from 'next/link';
import { ScanHistoryList } from '@/components/validator/scan-history-list';

export default function ValidatorDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [qrToken, setQrToken] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const [autoScanTriggered, setAutoScanTriggered] = useState(false);

  useEffect(() => {
    // Check if we should auto-scan (from URL parameter)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autoScan') === 'true' && !autoScanTriggered) {
      setAutoScanTriggered(true);
      // Small delay to ensure component is mounted
      setTimeout(() => {
        handleScan();
      }, 300);
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (qrToken.trim()) {
      router.push(`/verify/${qrToken.trim().toUpperCase()}`);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrToken(e.target.value.toUpperCase());
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      // Stop any existing scanner first
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop().catch(() => {});
      }

      // Check camera permissions — acquire and immediately release
      // so Html5Qrcode can manage its own stream without conflicts
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach((track) => track.stop());
        } catch (permErr) {
          console.error('Camera permission denied:', permErr);
          setScanError('Camera permission denied. Please allow camera access.');
          setIsScanning(false);
          return;
        }
      } else {
        setScanError('Camera not supported on this device or browser.');
        setIsScanning(false);
        return;
      }

      // Dynamically import html5-qrcode to reduce initial bundle size
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode("qr-reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          console.log('[Scanner] Decoded QR:', decodedText);

          // First, try to extract token from URL pattern (our accreditation URLs)
          const urlPattern = /\/verify\/([a-zA-Z0-9-]+)$/;
          const match = decodedText.match(urlPattern);
          const token = match ? match[1] : decodedText.trim();

          console.log('[Scanner] Extracted token:', token);

          // If we extracted a token from our URL pattern, use it directly
          if (match) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              router.push(`/verify/${token}`);
            }).catch(console.error);
            return;
          }

          // If it's not our URL pattern, validate the raw token
          // Check if it looks like an external URL (not our accreditation)
          if (token.startsWith('http://') || token.startsWith('https://')) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScanError('Invalid QR Code - This appears to be an external link, not an accreditation code.');
            }).catch(console.error);
            return;
          }

          // Limit token length to prevent abuse
          if (token.length > 50) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScanError('Invalid QR Code - The scanned code is too long to be a valid accreditation.');
            }).catch(console.error);
            return;
          }

          // Only allow alphanumeric and hyphens (accreditation format: ACC-0001 or UUID)
          if (!/^[a-zA-Z0-9-]+$/.test(token)) {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScanError('Invalid QR Code - This does not appear to be a valid accreditation code.');
            }).catch(console.error);
            return;
          }

          // Stop scanning and verify
          html5QrCode.stop().then(() => {
            setIsScanning(false);
            router.push(`/verify/${token}`);
          }).catch(console.error);
        },
        (errorMessage) => {
          // QR code scan error - ignore, fires continuously while scanning
        }
      );
    } catch (err: unknown) {
      console.error('Error starting QR scanner:', err);

      let errorMsg = 'Failed to access camera. ';
      const error = err as { name?: string };
      if (error.name === 'NotAllowedError') {
        errorMsg += 'Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMsg += 'No camera found.';
      } else if (error.name === 'NotReadableError') {
        errorMsg += 'Camera is already in use.';
      } else if (error.name === 'NotSupportedError') {
        errorMsg += 'HTTPS is required for camera access.';
      } else {
        errorMsg += (err as { message?: string }).message || 'Unknown error occurred.';
      }

      setScanError(errorMsg);
      setIsScanning(false);
    }
  };

  const handleStopScan = () => {
    if (html5QrCodeRef.current?.isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        setIsScanning(false);
        setScanError(null);
      }).catch(console.error);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-card rounded-2xl shadow-xl p-6 sm:p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">QR Scanner</h2>
            <p className="text-muted-foreground mb-6">Please sign in to use the scanner</p>
            <Link href="/login?callbackUrl=/validator">
              <Button className="w-full">Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Mobile-sized container - centered on desktop, full width on mobile */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-card rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Welcome Section */}
          <div className="text-center mb-6 lg:mb-10">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              Verify Badge
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground leading-relaxed">
              Scan QR code or enter accreditation number
            </p>
          </div>

          {/* Scanner Actions */}
          <div className="space-y-6">
            {/* Scan Button */}
            <Button
              onClick={handleScan}
              disabled={isScanning}
              className="w-full h-14 bce-gradient hover:opacity-90 text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isScanning ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Opening Camera...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  <Camera className="h-5 w-5" />
                  Scan QR Code
                </span>
              )}
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-card text-muted-foreground font-medium">or enter manually</span>
              </div>
            </div>

            {/* Manual Input */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter accreditation number..."
                  value={qrToken}
                  onChange={handleTokenChange}
                  className="flex-1 h-12 text-base"
                />
                <Button type="submit" className="h-12 px-6">
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </form>

            {/* Error Message */}
            {scanError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">{scanError}</p>
              </div>
            )}

            {/* User Info */}
            <div className="pt-6 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Logged in as <span className="font-semibold text-foreground">{session?.user?.name || session?.user?.email}</span>
              </p>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Scan History */}
      {session?.user?.id && <ScanHistoryList userId={session.user.id} />}

      {/* QR Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-card rounded-2xl p-6 max-w-lg w-full relative">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">Scanning...</h2>
              <button
                onClick={handleStopScan}
                className="text-muted-foreground hover:text-foreground hover:bg-accent p-2 rounded-full transition-colors z-50 relative"
                aria-label="Close scanner"
              >
                <X className="h-8 w-8" />
              </button>
            </div>

            <div id="qr-reader" className="rounded-xl overflow-hidden shadow-lg"></div>

            <p className="text-base text-muted-foreground mt-6 text-center font-medium">
              Position the QR code within the frame
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
