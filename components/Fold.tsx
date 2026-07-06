'use client';

import { useState } from 'react';

// Progressive disclosure: long passages stay, commentary folds. Less on
// screen, everything within one tap. Shared by the detail panel and the
// arrival overlay (the "another way" fold, locked decision 12).
export default function Fold({
  label,
  children,
  defaultOpen = false,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  tone?: 'ember';
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`fold${open ? ' open' : ''}${tone ? ` ${tone}` : ''}`}>
      <button className="fold-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>{label}</span>
        <span className="chev" aria-hidden>
          ▾
        </span>
      </button>
      <div className="fold-body">
        <div className="fold-inner">{children}</div>
      </div>
    </div>
  );
}
