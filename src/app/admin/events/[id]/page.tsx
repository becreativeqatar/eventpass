'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    document.cookie = `ep_selected_event=${id};path=/;max-age=31536000`;
    router.replace('/admin');
  }, [id, router]);

  return null;
}
