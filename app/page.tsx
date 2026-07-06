import Link from 'next/link';
import { sessions } from '@/lib/sessions';
import { lineageColor, rejectedColor } from '@/lib/lineage';
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

      <div className="session-list">
        {sessions.map((s) => {
          const accepted = s.parallels.filter((p) => p.status === 'accepted').length;
          const rejected = s.parallels.length - accepted;
          return (
            <Link key={s.id} href={`/session/${s.id}`} className="session-card">
              <div className="card-top">
                <span className="pill dim">{s.painCategory}</span>
                <span className="lineage-dots" aria-hidden>
                  {s.parallels.map((p) => (
                    <span
                      key={p.id}
                      className={`dot${p.status === 'rejected' ? ' rejected' : ''}`}
                      style={{
                        // rejected parallels keep their ember tone — visibly
                        // distinct even at the scale of a card
                        backgroundColor:
                          p.status === 'rejected' ? 'transparent' : lineageColor[p.lineage],
                        borderColor:
                          p.status === 'rejected' ? rejectedColor : lineageColor[p.lineage],
                      }}
                    />
                  ))}
                </span>
              </div>
              <div className="complaint">“{s.surfaceComplaint}”</div>
              <div className="card-sub">
                {accepted} parallels · {rejected} rejected · one practice
              </div>
            </Link>
          );
        })}
      </div>

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
