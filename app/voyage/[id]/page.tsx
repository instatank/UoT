import { notFound } from 'next/navigation';
import { getSession, sessions } from '@/lib/sessions';
import VoyageView from '@/components/VoyageView';

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export default async function VoyagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  return <VoyageView session={session} />;
}
