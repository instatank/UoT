import { notFound } from 'next/navigation';
import { getSession, sessions } from '@/lib/sessions';
import RetreatView from '@/components/RetreatView';

export function generateStaticParams() {
  return sessions.map((s) => ({ id: s.id }));
}

export default async function RetreatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getSession(id);
  if (!session) notFound();
  return <RetreatView session={session} />;
}
