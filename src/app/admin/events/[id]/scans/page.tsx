'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EventScansRedirect() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    document.cookie = `ep_selected_event=${id};path=/;max-age=31536000`;
    router.replace('/admin/scans');
  }, [id, router]);

  return null;
}
