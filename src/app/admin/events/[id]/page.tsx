import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  cookieStore.set('ep_selected_event', id, { path: '/', maxAge: 31536000 });
  redirect('/admin');
}
