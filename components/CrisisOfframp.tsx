'use client';

// The crisis off-ramp (locked decision 11): if intake signals acute danger,
// the Descent does not begin. Calm, full-screen, real resources, plain
// language, easy way back. A floor requirement of operating in this category
// at all — ships with day one of intake, before any other Door polish.

export default function CrisisOfframp({ onBack }: { onBack: () => void }) {
  return (
    <div className="crisis">
      <span className="eyebrow">Stop here for a moment</span>
      <h1>This deserves more than a map.</h1>
      <p className="crisis-body">
        What you wrote sounds like it could be about staying safe — yours or someone else&rsquo;s.
        This app is contemplation, not care, and right now care is what&rsquo;s called for.
      </p>
      <ul className="crisis-resources">
        <li>
          <strong>In immediate danger?</strong> Call your local emergency number — 911, 112, or
          999.
        </li>
        <li>
          <strong>United States:</strong> call or text <a href="tel:988">988</a> — the Suicide
          &amp; Crisis Lifeline, free, 24/7.
        </li>
        <li>
          <strong>UK &amp; Ireland:</strong> Samaritans, <a href="tel:116123">116&nbsp;123</a>,
          free, 24/7.
        </li>
        <li>
          <strong>Everywhere else:</strong>{' '}
          <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer">
            findahelpline.com
          </a>{' '}
          lists free, confidential helplines by country.
        </li>
      </ul>
      <p className="crisis-note">
        What you wrote was not stored — it was read once, to show you this screen.
      </p>
      <button className="crisis-back" onClick={onBack}>
        ← I&rsquo;m not in danger — take me back
      </button>
    </div>
  );
}
