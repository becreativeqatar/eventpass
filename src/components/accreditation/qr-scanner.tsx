'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AccreditationStatusBadge } from './status-badge';
import { PhaseBadge } from './phase-badge';
import type { AccreditationPhase } from '@/lib/validations/accreditation';

interface ScanResult {
  allowed: boolean;
  result: string;
  message: string;
  accreditation?: {
    id: string;
    firstName: string;
    lastName: string;
    company?: string | null;
    role?: string | null;
    photoUrl?: string | null;
    phases: string[];
    status: string;
    project: {
      id: string;
      name: string;
    };
  };
}

export function QRScanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<AccreditationPhase>('LIVE');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanning = async () => {
    setError(null);
    setScanResult(null);

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        handleScan,
        () => {} // Ignore errors during scanning
      );

      setIsScanning(true);
    } catch (err) {
      setError('Failed to start camera. Please ensure camera permissions are granted.');
      console.error(err);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setIsScanning(false);
    }
  };

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    await stopScanning();

    try {
      // Extract verification token from QR code
      // QR might contain full URL or just token
      let verificationToken = decodedText;

      if (decodedText.includes('/verify/')) {
        const parts = decodedText.split('/verify/');
        verificationToken = parts[parts.length - 1];
      }

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationToken,
          phase: currentPhase,
        }),
      });

      const data = await res.json();

      if (data.data) {
        setScanResult(data.data);
      } else {
        setError(data.error || 'Scan failed');
      }
    } catch (err) {
      setError('Failed to verify accreditation');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Phase</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Select the phase you are scanning for:</Label>
            <Select
              value={currentPhase}
              onValueChange={(value) => setCurrentPhase(value as AccreditationPhase)}
              disabled={isScanning}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUMP_IN">Bump In</SelectItem>
                <SelectItem value="LIVE">Live</SelectItem>
                <SelectItem value="BUMP_OUT">Bump Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>QR Scanner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="qr-reader"
            className="w-full max-w-md mx-auto bg-muted rounded-lg overflow-hidden"
            style={{ minHeight: isScanning ? 300 : 0 }}
          />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-4 justify-center">
            {!isScanning && !scanResult && (
              <Button onClick={startScanning} size="lg">
                Start Scanning
              </Button>
            )}

            {isScanning && (
              <Button onClick={stopScanning} variant="outline" size="lg">
                Stop Scanning
              </Button>
            )}

            {scanResult && (
              <Button onClick={resetScanner} size="lg">
                Scan Another
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {scanResult && (
        <Card className={scanResult.allowed ? 'border-green-500 border-2' : 'border-red-500 border-2'}>
          <CardHeader>
            <CardTitle className={scanResult.allowed ? 'text-green-600' : 'text-red-600'}>
              {scanResult.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{scanResult.message}</p>

            {scanResult.accreditation && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center gap-4">
                  {scanResult.accreditation.photoUrl && (
                    <img
                      src={scanResult.accreditation.photoUrl}
                      alt="Photo"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h3 className="text-xl font-semibold">
                      {scanResult.accreditation.firstName} {scanResult.accreditation.lastName}
                    </h3>
                    {scanResult.accreditation.company && (
                      <p className="text-muted-foreground">{scanResult.accreditation.company}</p>
                    )}
                    {scanResult.accreditation.role && (
                      <p className="text-sm">{scanResult.accreditation.role}</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <AccreditationStatusBadge status={scanResult.accreditation.status} />
                </div>

                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-sm text-muted-foreground">Phases:</span>
                  {scanResult.accreditation.phases.map((phase) => (
                    <PhaseBadge key={phase} phase={phase as AccreditationPhase} />
                  ))}
                </div>

                <div className="text-sm text-muted-foreground">
                  Project: {scanResult.accreditation.project.name}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
