import Link from 'next/link';
import { sessions } from '@/lib/sessions';
import ConstellationNote from '@/components/ConstellationNote';

export default function Home() {
  return (
    <main className="home">
      <span className="eyebrow">Truth Unites — architecture sandbox</span>
      <h1>Where does it hurt?</h1>
      <p className="sub">
        One session loop — pain, mechanism, parallels, practice — rendered in three switchable
        geometries. Pick a session, then compare radial, river, and descent on identical content.
      </p>

      {sessions.map((s) => (
        <Link key={s.id} href={`/session/${s.id}`} className="session-card">
          <span className="chip">{s.painCategory}</span>
          <div className="complaint">“{s.surfaceComplaint}”</div>
        </Link>
      ))}

      <div className="home-foot">
        <p>
          Cold start via picker is provisional — how a pain point gets named at session start is an
          open problem, not a decision.
        </p>
        <ConstellationNote />
      </div>
    </main>
  );
}
