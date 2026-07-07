'use client';

// ScanCorrect — technical / utilitarian marketing concept.
// Dark cool-slate canvas, Fraunces serif headlines vs JetBrains Mono data
// labels, blue accent, and a metadata "diff" as the central motif.
// Design tokens (--bg, --surface, --mono, …) live in app/globals.css.

import { useState } from 'react';
import { Icon } from '@iconify/react';

export const PLATFORMS = [
  { id: 'mac', label: 'macOS', icon: 'mdi:apple', href: '/download/mac' },
  { id: 'win', label: 'Windows', icon: 'mdi:microsoft-windows', href: '/download/win' },
  { id: 'linux', label: 'Linux', icon: 'mdi:linux', href: '/download/linux' },
];

export function MonoEyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '0.18em',
      textTransform: 'uppercase', color: color || 'var(--blue)', display: 'flex',
      alignItems: 'center', gap: 10 }}>
      <span style={{ width: 24, height: 1, background: 'currentColor', opacity: 0.5 }} />
      {children}
    </div>
  );
}

export function DownloadButton({ platform, primary, onClick, active }: {
  platform: { label: string; icon: string; href?: string };
  primary?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const style: React.CSSProperties = {
    fontFamily: 'var(--mono)', fontSize: 13, letterSpacing: '0.02em',
    padding: '11px 18px', borderRadius: 8, cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 8,
    border: primary ? 'none' : '1px solid var(--border)',
    background: primary ? (hover ? '#2f6fe0' : 'var(--blue)') : (hover ? 'var(--surface-2)' : 'transparent'),
    color: primary ? '#fff' : 'var(--text)',
    textDecoration: 'none',
    transition: 'background-color 160ms ease, border-color 160ms ease',
  };
  const content = (
    <>
      <Icon icon={platform.icon} style={{ fontSize: 16, opacity: primary ? 1 : 0.7 }} />
      {active ? 'downloading…' : platform.label}
    </>
  );

  if (platform.href) {
    return (
      <a href={platform.href} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={style}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={style}>
      {content}
    </button>
  );
}

/* ---- the metadata diff (hero centerpiece) -------------------------------- */
const DIFF = {
  removed: [['Make', 'Epson'], ['Model', 'Perfection V600'], ['Software', 'Epson Scan 2']],
  added: [['Make', 'Pentax'], ['Model', 'ME Super'], ['Lens', 'SMC Pentax-M 50mm f/1.7'],
          ['ISO', '400'], ['FNumber', 'f/1.7']],
};

export function DiffCard() {
  const Row = ({ sign, k, v }: { sign: string; k: string; v: string }) => {
    const c = sign === '-' ? 'var(--red)' : 'var(--green)';
    const bg = sign === '-' ? 'rgba(248,81,73,0.08)' : 'rgba(63,185,80,0.09)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 16px', background: bg,
        borderLeft: `2px solid ${c}` }}>
        <span style={{ color: c, width: 8, flexShrink: 0 }}>{sign}</span>
        <span style={{ color: 'var(--muted)', width: 92, flexShrink: 0 }}>{k}</span>
        <span style={{ color: sign === '-' ? 'var(--faint)' : 'var(--text)',
          textDecoration: sign === '-' ? 'line-through' : 'none' }}>{v}</span>
      </div>
    );
  };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden',
      background: 'var(--surface)', boxShadow: '0 24px 60px rgba(0,0,0,0.45)', fontFamily: 'var(--mono)', fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px',
        borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
        <Icon icon="mdi:file-image" style={{ color: 'var(--blue)', fontSize: 16 }} />
        <span style={{ color: 'var(--text)', fontSize: 12.5 }}>HP5_221025_022.jpg</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)',
          display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)' }} />corrected
        </span>
      </div>
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 3, lineHeight: 1.7 }}>
        <div style={{ padding: '2px 16px 6px', color: 'var(--faint)', fontSize: 11, letterSpacing: '0.05em' }}>EXIF · IFD0</div>
        {DIFF.removed.map(([k, v]) => <Row key={k} sign="-" k={k} v={v} />)}
        {DIFF.added.map(([k, v]) => <Row key={k} sign="+" k={k} v={v} />)}
      </div>
    </div>
  );
}
