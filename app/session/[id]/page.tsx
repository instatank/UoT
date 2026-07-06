import { notFound } from 'next/navigation';
import { getSession, sessions } from '@/lib/sessions';
import SessionView from '@/components/SessionView';

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  return <SessionView session={session} />;
}
