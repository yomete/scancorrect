"use client";

import { Icon } from "@iconify/react";
import { MonoEyebrow, DownloadButton, PLATFORMS } from "./Shared";

const SPECS = [
  {
    n: "01",
    icon: "mdi:camera",
    h: "Camera profiles",
    p: "Save each body and lens once;  Nikon FM2, Leica M6, Mamiya 7, then apply across hundreds of scans.",
    rows: [
      ["profiles", "unlimited"],
      ["fields", "make · model · lens · iso"],
    ],
  },
  {
    n: "02",
    icon: "mdi:layers-triple",
    h: "Batch rewrite",
    p: "Drop a roll, pick a profile, click once. Every frame gets the same correct metadata.",
    rows: [
      ["per roll", "36+ frames"],
      ["formats", "jpg · jpeg · tiff"],
    ],
  },
  {
    n: "03",
    icon: "mdi:shield-lock",
    h: "Local & offline",
    p: "Runs entirely on your machine. No cloud, no sign-up, no telemetry.",
    rows: [
      ["network", "none"],
      ["engine", "exiftool"],
    ],
  },
];

export function SpecFeatures() {
  return (
    <section
      style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 28px" }}>
        <div
          className="spec-grid"
          style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}
        >
          {SPECS.map((s, i) => (
            <div
              key={s.n}
              className="spec-cell"
              style={{
                padding: "48px 32px",
                borderLeft: i === 0 ? "none" : "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Icon
                  icon={s.icon}
                  style={{ fontSize: 26, color: "var(--blue)" }}
                />
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                    color: "var(--faint)",
                  }}
                >
                  {s.n}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  fontWeight: 600,
                  color: "var(--text)",
                  margin: "22px 0 10px",
                }}
              >
                {s.h}
              </h3>
              <p
                className="text-pretty"
                style={{
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: "var(--muted)",
                  margin: 0,
                }}
              >
                {s.p}
              </p>
              <div
                style={{
                  marginTop: 22,
                  borderTop: "1px solid var(--border)",
                  paddingTop: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 7,
                }}
              >
                {s.rows.map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontFamily: "var(--mono)",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--faint)" }}>{k}</span>
                    <span style={{ color: "var(--text)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS: [string, string][] = [
  [
    "drop",
    "Drag a folder of scans into ScanCorrect. It reads the existing EXIF and flags anything stamped by your scanner.",
  ],
  [
    "profile",
    "Pick or create a camera profile. The correct make, model and lens stage as pending changes on every selected frame.",
  ],
  [
    "review",
    "Scan the diff in the sidebar — struck-out scanner data, the corrected values in blue. Tweak any field by hand.",
  ],
  [
    "write",
    "Hit Save. ExifTool writes the metadata back to your files in place. Undo any change from History.",
  ],
];

export function HowItWorks() {
  return (
    <section
      id="how"
      style={{
        maxWidth: 1140,
        margin: "0 auto",
        padding: "96px 28px",
        scrollMarginTop: 70,
      }}
    >
      <MonoEyebrow>How it works</MonoEyebrow>
      <h2
        className="text-balance"
        style={{
          fontFamily: "var(--serif)",
          fontSize: "clamp(2rem, 3.4vw, 2.75rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          margin: "20px 0 48px",
          maxWidth: 560,
        }}
      >
        Four steps from "Epson" to your actual camera.
      </h2>
      <div
        className="steps-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
        }}
      >
        {STEPS.map(([k, p], i) => (
          <div
            key={k}
            className="step-cell"
            style={{
              padding: "0 22px",
              borderLeft: i === 0 ? "none" : "1px solid var(--border)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                color: "var(--blue)",
                marginBottom: 12,
              }}
            >
              {String(i + 1).padStart(2, "0")} / {k}
            </div>
            <p
              className="text-pretty"
              style={{
                fontSize: 14.5,
                lineHeight: 1.6,
                color: "var(--muted)",
                margin: 0,
              }}
            >
              {p}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DownloadFooter({
  picked,
  onPick,
}: {
  picked: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <footer
      id="download"
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--surface)",
        scrollMarginTop: 60,
      }}
    >
      <div style={{ maxWidth: 1140, margin: "0 auto", padding: "80px 28px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 32,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: "clamp(2rem,3.4vw,2.75rem)",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                margin: 0,
              }}
            >
              Download ScanCorrect
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PLATFORMS.map((p, i) => (
              <DownloadButton
                key={p.id}
                platform={p}
                primary={i === 0}
                active={picked === p.id}
                onClick={() => onPick(p.id)}
              />
            ))}
          </div>
        </div>
        <div
          style={{
            marginTop: 64,
            paddingTop: 26,
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            fontFamily: "var(--mono)",
            fontSize: 12,
            color: "var(--faint)",
          }}
        >
          <span>
            ScanCorrect — built by a film photographer,{" "}
            <a
              href="https://pics.yomieluwan.de/"
              target="_blank"
              rel="noreferrer"
              style={{
                color: "var(--muted)",
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Yomi Eluwande
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
