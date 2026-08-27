'use client';

// Polished drag-to-compare metadata reveal. Wipes ONE film frame's inspector
// card between its scanner state (wrong camera, struck red, flat scan) and its
// corrected state (real camera data, crisp). Pointer + touch + keyboard driven.

import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { MonoEyebrow } from './Shared';

const ROWS: [string, string, string, boolean][] = [
  // [label,     before,            after,                       cameraField]
  ['Camera',    'Epson',           'Pentax',                    true],
  ['Model',     'Perfection V600', 'ME Super',                  true],
  ['Lens',      '—',               'SMC Pentax-M 50mm f/1.7',   true],
  ['ISO',       '—',               '400',                       false],
  ['Aperture',  '—',               'ƒ/1.7',                     false],
  ['Software',  'Epson Scan 2',    '—',                         false],
];

const ROW_H = 38;

const InspectorFace = memo(function InspectorFace({ variant }: { variant: 'before' | 'after' }) {
  const before = variant === 'before';
  return (
    <div className="face-root" style={{ position: 'absolute', inset: 0, display: 'flex', background: 'var(--surface)', userSelect: 'none' }}>
      {/* photo */}
      <div className="face-photo" style={{ position: 'relative', width: '42%', flexShrink: 0, overflow: 'hidden', background: '#000' }}>
        <img src="/film-thumb.png" alt="film frame" draggable={false}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            filter: before ? 'grayscale(1) contrast(0.82) brightness(1.08)' : 'grayscale(1) contrast(1.12)',
            transition: 'filter 120ms linear' }} />
        <div style={{ position: 'absolute', inset: 0, background: before
          ? 'linear-gradient(180deg, rgba(248,81,73,0.10), transparent 40%)' : 'transparent' }} />
        {/* state badge */}
        <div style={{ position: 'absolute', top: 16, left: 16, display: 'inline-flex', alignItems: 'center', gap: 7,
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '6px 11px', borderRadius: 999, backdropFilter: 'blur(6px)',
          background: before ? 'rgba(248,81,73,0.16)' : 'rgba(63,185,80,0.16)',
          border: `1px solid ${before ? 'rgba(248,81,73,0.5)' : 'rgba(63,185,80,0.5)'}`,
          color: before ? '#ff8079' : '#5fd273' }}>
          <Icon icon={before ? 'mdi:scanner' : 'mdi:check-circle'} style={{ fontSize: 14 }} />
          {before ? 'scanner' : 'corrected'}
        </div>
        {/* filename chip */}
        <div style={{ position: 'absolute', bottom: 14, left: 16, fontFamily: 'var(--mono)', fontSize: 11,
          color: '#e6edf3', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          padding: '4px 9px', borderRadius: 6 }}>HP5_221025_022.jpg</div>
      </div>
      {/* metadata */}
      <div className="face-meta" style={{ flex: 1, minWidth: 0, padding: '20px 26px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--faint)', marginBottom: 14 }}>EXIF · IFD0</div>
        <div>
          {ROWS.map(([label, b, a, cam]) => {
            const val = before ? b : a;
            const empty = val === '—';
            let color = 'var(--text)';
            let deco = 'none';
            let dot: string | null = null;
            if (before && cam) { color = '#f85149'; deco = 'line-through'; dot = '#f85149'; }
            else if (!before && cam) { color = 'var(--text)'; dot = 'var(--green)'; }
            else if (empty) { color = 'var(--faint)'; }
            return (
              <div key={label} style={{ height: ROW_H, display: 'flex', alignItems: 'center', gap: 12,
                borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--faint)', width: 78, flexShrink: 0 }}>{label}</span>
                {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0,
                  boxShadow: !before ? '0 0 8px rgba(63,185,80,0.7)' : 'none' }} />}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 13.5, color, textDecoration: deco,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 16, fontFamily: 'var(--mono)', fontSize: 11.5,
          color: before ? '#ff8079' : 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <Icon icon={before ? 'mdi:alert-circle-outline' : 'mdi:check'} style={{ fontSize: 14 }} />
          {before ? '3 fields written by your scanner' : '5 fields restored from camera profile'}
        </div>
      </div>
    </div>
  );
});

export function MetadataReveal() {
  const [pos, setPos] = useState(58);
  const [hint, setHint] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // one-time intro nudge: settle 58 → 50 so it reads as draggable
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const from = 58, to = 50, dur = 760;
    const step = (t: number) => {
      if (start == null) start = t;
      const k = Math.min(1, (t - start) / dur);
      const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
      setPos(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const setFromX = useCallback((clientX: number) => {
    if (!wrap.current) return;
    const r = wrap.current.getBoundingClientRect();
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    setHint(false);
    try { wrap.current?.setPointerCapture?.(e.pointerId); } catch {}
    setFromX(e.clientX);
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => { if (dragging.current) setFromX(e.clientX); };
  const onUp = () => { dragging.current = false; };

  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowLeft') { setHint(false); setPos((p) => Math.max(2, p - 4)); }
    if (e.key === 'ArrowRight') { setHint(false); setPos((p) => Math.min(98, p + 4)); }
  };

  return (
    <section style={{ borderTop: '1px solid var(--border)' }}>
      <div className="site-container" style={{ maxWidth: 1140, margin: '0 auto', padding: '88px 28px' }}>
        <MonoEyebrow>Before / after</MonoEyebrow>
        <h2 className="text-balance" style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(2rem, 3.4vw, 2.75rem)', fontWeight: 600,
          letterSpacing: '-0.02em', color: 'var(--text)', margin: '20px 0 8px', maxWidth: 620 }}>
          Drag the line. Watch your scanner's fingerprints disappear.
        </h2>
        <p className="text-pretty" style={{ fontSize: 16, color: 'var(--muted)', margin: '0 0 40px', maxWidth: 520 }}>
          Same frame, same file — only the metadata changes. The scanner's guesses on the left,
          your real camera on the right.
        </p>

        <div
          ref={wrap}
          className="reveal-card"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
          onPointerCancel={onUp} onPointerLeave={onUp}
          style={{ position: 'relative', width: '100%', maxWidth: 880, height: 392,
            borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)',
            boxShadow: '0 40px 90px rgba(0,0,0,0.5)', cursor: 'col-resize', touchAction: 'pan-y' }}>
          {/* AFTER (base) */}
          <InspectorFace variant="after" />
          {/* BEFORE (clipped to left of handle) */}
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
            <InspectorFace variant="before" />
          </div>
          {/* divider + handle */}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${pos}%`, width: 2,
            background: 'linear-gradient(180deg, rgba(230,237,243,0.15), rgba(230,237,243,0.85), rgba(230,237,243,0.15))',
            transform: 'translateX(-1px)', zIndex: 10 }}>
            <button
              tabIndex={0} onKeyDown={onKey} aria-label="Drag to compare scanner and corrected metadata"
              style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: 46, height: 46, borderRadius: '50%', border: '1px solid var(--border)',
                background: 'var(--surface-2)', boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'col-resize',
                color: 'var(--text)', outlineColor: 'var(--blue)', touchAction: 'none' }}>
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
                <path d="M6 2L1 7L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 2L17 7L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {hint &&
              <span style={{ position: 'absolute', top: 'calc(50% + 34px)', left: '50%', transform: 'translateX(-50%)',
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.08em', color: 'var(--muted)',
                whiteSpace: 'nowrap', animation: 'scPulse 1.8s ease-in-out infinite' }}>drag</span>}
          </div>
        </div>
      </div>
    </section>
  );
}
