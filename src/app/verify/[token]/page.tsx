'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Calendar, Building2, Shield, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { formatQatarDate } from '@/lib/date';

interface AccreditationData {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  role: string;
  accessGroup: string;
  photoUrl: string | null;
  qidNumber: string | null;
  project: {
    name: string;
    code: string;
  };
  phases: {
    bumpIn: {
      start: string;
      end: string;
    } | null;
    live: {
      start: string;
      end: string;
    } | null;
    bumpOut: {
      start: string;
      end: string;
    } | null;
  };
  status: string;
  isValidToday: boolean;
}

export default function VerifyAccreditationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [accreditation, setAccreditation] = useState<AccreditationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
  name?: string;
  phases?: {
    bumpIn?: { start: string; end: string };
    live?: { start: string; end: string };
    bumpOut?: { start: string; end: string };
  };
} | null>(null);
  const [unwrappedParams, setUnwrappedParams] = useState<{ token: string } | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  useEffect(() => {
    params.then(setUnwrappedParams);
  }, [params]);

  useEffect(() => {
    if (unwrappedParams) {
      fetchAccreditation();
    }
  }, [unwrappedParams]);

  const fetchAccreditation = async () => {
    if (!unwrappedParams) return;

    try {
      const response = await fetch(`/api/verify/${unwrappedParams.token}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          setError(errorData.message || 'Invalid QR Code - This code does not exist in our system');
          setErrorType('NOT_FOUND');
        } else if (response.status === 403) {
          setError(errorData.message || errorData.error || 'Access Denied');
          setErrorType(errorData.errorType || 'DENIED');

          if (errorData.name || errorData.phases) {
            setErrorDetails({
              name: errorData.name,
              phases: errorData.phases
            });
          }
        } else if (response.status === 401) {
          setError('Authentication Required - Please log in to verify accreditations');
          setErrorType('AUTH_REQUIRED');
        } else {
          setError(errorData.message || 'Verification Failed - Unable to process this accreditation');
          setErrorType('UNKNOWN');
        }
        return;
      }

      const data = await response.json();
      setAccreditation(data.data);
    } catch (error) {
      console.error('Error fetching accreditation:', error);
      setError('Failed to verify accreditation');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatQatarDate(dateString);
  };

  const formatDateRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto">
        {isLoading ? (
          <div className="min-h-[600px] flex items-center justify-center bg-card rounded-2xl shadow-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-3 border-muted border-t-foreground mx-auto mb-4"></div>
              <p className="text-muted-foreground text-base font-medium">Verifying accreditation...</p>
            </div>
          </div>
        ) : error ? (
          errorType === 'NOT_VALID_TODAY' || errorType === 'REVOKED' ? (
            /* Keep red gradient for denied — security UX */
            <div className="min-h-[600px] rounded-2xl shadow-xl overflow-hidden bg-gradient-to-br from-red-500 to-pink-600">
              <div className="min-h-[600px] flex flex-col p-4 pt-6">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center rounded-full w-16 h-16 bg-white mb-2 shadow-xl">
                    <XCircle className="h-10 w-10 text-red-600 stroke-[3]" />
                  </div>
                  <h1 className="text-2xl font-black text-white mb-1">
                    {errorType === 'REVOKED' ? 'ACCESS REVOKED' : 'ACCESS DENIED'}
                  </h1>
                </div>

                <Card className="flex-1 shadow-2xl border-0 overflow-auto mb-4">
                  <CardContent className="p-4 bg-white">
                    <div className="text-center mb-4">
                      {errorDetails && errorDetails.name && (
                        <h2 className="text-2xl font-bold text-foreground mt-3 mb-1">
                          {errorDetails.name}
                        </h2>
                      )}
                    </div>

                    <div className="text-center mb-4">
                      <p className="text-muted-foreground text-base leading-relaxed">{error}</p>
                    </div>

                    {errorType === 'NOT_VALID_TODAY' && errorDetails?.phases && (
                      <div className="space-y-2">
                        <div className="bg-muted/50 rounded-lg p-3 border border-border">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground font-semibold uppercase">Valid Periods</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            {errorDetails.phases.bumpIn && (
                              <div>
                                <span className="font-semibold text-foreground">Bump-In:</span>{' '}
                                <span className="text-muted-foreground">{formatDateRange(errorDetails.phases.bumpIn.start, errorDetails.phases.bumpIn.end)}</span>
                              </div>
                            )}
                            {errorDetails.phases.live && (
                              <div>
                                <span className="font-semibold text-foreground">Live:</span>{' '}
                                <span className="text-muted-foreground">{formatDateRange(errorDetails.phases.live.start, errorDetails.phases.live.end)}</span>
                              </div>
                            )}
                            {errorDetails.phases.bumpOut && (
                              <div>
                                <span className="font-semibold text-foreground">Bump-Out:</span>{' '}
                                <span className="text-muted-foreground">{formatDateRange(errorDetails.phases.bumpOut.start, errorDetails.phases.bumpOut.end)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="text-center">
                  <Button
                    onClick={() => router.push('/validator?autoScan=true')}
                    className="bg-white text-foreground hover:bg-muted shadow-lg font-semibold w-full max-w-xs"
                  >
                    Scan Next
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Card className="shadow-xl border-0 rounded-2xl">
              <CardContent className="pt-12 pb-10 px-6 text-center">
                <div className="mb-6">
                  <XCircle className="h-14 w-14 mx-auto text-muted-foreground" strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-semibold text-foreground mb-3">
                  {errorType === 'NOT_FOUND' ? 'Record Not Found' :
                   errorType === 'REJECTED' ? 'Application Rejected' :
                   errorType === 'PENDING' ? 'Pending Approval' :
                   'Verification Failed'}
                </h1>

                {errorDetails && errorDetails.name && (
                  <div className="mb-4 p-4 rounded-lg border bg-warning/10 border-warning/30">
                    <p className="text-lg font-bold mb-1 text-warning">{errorDetails.name}</p>
                  </div>
                )}

                <p className="text-muted-foreground text-base leading-relaxed mb-8">{error}</p>

                <Button
                  onClick={() => router.push('/validator?autoScan=true')}
                  className="font-medium"
                >
                  Scan Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )
        ) : !accreditation ? null : (
          /* Keep green/red verification gradients — security UX, must not change */
          <div className={`min-h-[600px] rounded-2xl shadow-xl overflow-hidden ${
            accreditation.isValidToday
              ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : 'bg-gradient-to-br from-red-500 to-pink-600'
          }`}>
            <div className="min-h-[600px] flex flex-col p-4 pt-6">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center rounded-full w-16 h-16 bg-white mb-2 shadow-xl">
                {accreditation.isValidToday ? (
                  <CheckCircle className="h-10 w-10 text-green-600 stroke-[3]" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600 stroke-[3]" />
                )}
              </div>
              <h1 className="text-2xl font-black text-white mb-1">
                {accreditation.isValidToday ? 'VALID ACCESS' : 'ACCESS DENIED'}
              </h1>
            </div>

            <Card className="flex-1 shadow-2xl border-0 overflow-auto mb-4">
              <CardContent className="p-4 bg-white">

                <div className="text-center mb-4">
                  {accreditation.photoUrl ? (
                    <div className="relative inline-block cursor-pointer" onClick={() => setShowPhotoModal(true)}>
                      <Image
                        src={accreditation.photoUrl}
                        alt={`${accreditation.firstName} ${accreditation.lastName}`}
                        width={100}
                        height={100}
                        className="rounded-xl object-cover border-3 border-border shadow-lg hover:opacity-90 transition-opacity"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 mx-auto rounded-xl flex items-center justify-center border-3 border-border bg-muted shadow-lg">
                      <span className="text-3xl font-bold text-muted-foreground">
                        {accreditation.firstName[0]}{accreditation.lastName[0]}
                      </span>
                    </div>
                  )}

                  <h2 className="text-2xl font-bold text-foreground mt-3 mb-1">
                    {accreditation.firstName} {accreditation.lastName}
                  </h2>
                  {accreditation.qidNumber && (
                    <p className="text-sm text-foreground font-semibold">QID: {accreditation.qidNumber}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-semibold uppercase">Organization</p>
                        <p className="text-base font-bold text-foreground truncate">{accreditation.company || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground font-semibold uppercase">Access Group</p>
                        <p className="text-base font-bold text-foreground truncate">{accreditation.accessGroup}</p>
                      </div>
                    </div>
                  </div>

                  {(accreditation.phases.bumpIn || accreditation.phases.live || accreditation.phases.bumpOut) && (
                    <div className="bg-muted/50 rounded-lg p-3 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase">Valid Periods</span>
                      </div>
                      <div className="space-y-1 text-xs">
                        {accreditation.phases.bumpIn && (
                          <div>
                            <span className="font-semibold text-foreground">Bump-In:</span>{' '}
                            <span className="text-muted-foreground">{formatDateRange(accreditation.phases.bumpIn.start, accreditation.phases.bumpIn.end)}</span>
                          </div>
                        )}
                        {accreditation.phases.live && (
                          <div>
                            <span className="font-semibold text-foreground">Live:</span>{' '}
                            <span className="text-muted-foreground">{formatDateRange(accreditation.phases.live.start, accreditation.phases.live.end)}</span>
                          </div>
                        )}
                        {accreditation.phases.bumpOut && (
                          <div>
                            <span className="font-semibold text-foreground">Bump-Out:</span>{' '}
                            <span className="text-muted-foreground">{formatDateRange(accreditation.phases.bumpOut.start, accreditation.phases.bumpOut.end)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            <div className="text-center">
              <Button
                onClick={() => router.push('/validator?autoScan=true')}
                className="bg-white text-foreground hover:bg-muted shadow-lg font-semibold w-full max-w-xs"
              >
                Scan Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {showPhotoModal && accreditation.photoUrl && (
              <div
                className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
                onClick={() => setShowPhotoModal(false)}
              >
                <div className="relative max-w-4xl max-h-full">
                  <button
                    onClick={() => setShowPhotoModal(false)}
                    className="absolute -top-12 right-0 text-white hover:text-muted-foreground text-4xl font-bold"
                  >
                    x
                  </button>
                  <Image
                    src={accreditation.photoUrl}
                    alt={`${accreditation.firstName} ${accreditation.lastName}`}
                    width={800}
                    height={800}
                    className="object-contain max-h-[80vh] rounded-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <p className="text-white text-center mt-4 text-sm">
                    {accreditation.firstName} {accreditation.lastName}
                  </p>
                </div>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
