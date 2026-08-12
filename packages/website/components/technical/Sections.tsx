"use client";

import { Icon } from "@iconify/react";
import { MonoEyebrow, DownloadButton, DiffCard, PLATFORMS } from "./Shared";

export function Nav({ onDownload }: { onDownload: () => void }) {
  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "rgba(13,17,23,0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className="site-container"
        style={{
          maxWidth: 1140,
          margin: "0 auto",
          padding: "0 28px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <img
            src="/scancorrect-icon.png"
            alt=""
            style={{ width: 26, height: 26, borderRadius: 7 }}
          />
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 14,
              letterSpacing: "0.02em",
              color: "var(--text)",
              fontWeight: 500,
            }}
          >
            scancorrect
          </span>
          <span
            className="nav-badge"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              color: "var(--faint)",
              border: "1px solid var(--border)",
              borderRadius: 5,
              padding: "2px 6px",
            }}
          >
            v1.0
          </span>
        </div>
        <div
          className="nav-links"
          style={{ display: "flex", alignItems: "center", gap: 22 }}
        >
          <a
            href="#how"
            className="nav-how"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 13,
              color: "var(--muted)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            how it works
          </a>
          <a
            href="https://github.com/yomete/film-exif-editor"
            target="_blank"
            rel="noreferrer"
            aria-label="Source on GitHub"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 13,
              color: "var(--muted)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon icon="mdi:github" style={{ fontSize: 16 }} />
            <span className="nav-source-label">source</span>
          </a>
          <DownloadButton
            platform={{ label: "Download", icon: "mdi:tray-arrow-down" }}
            primary
            onClick={onDownload}
          />
        </div>
      </div>
    </nav>
  );
}

export function Hero({
  onDownload,
  picked,
  onPick,
}: {
  onDownload: () => void;
  picked: string | null;
  onPick: (id: string) => void;
}) {
  return (
    <section style={{ position: "relative", overflow: "hidden" }}>
      {/* technical grid backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.5,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 35%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, #000 35%, transparent 75%)",
        }}
      />
      <div
        className="hero-grid site-container"
        style={{
          position: "relative",
          maxWidth: 1140,
          margin: "0 auto",
          padding: "88px 28px 64px",
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 56,
          alignItems: "center",
        }}
      >
        <div>
          <MonoEyebrow>EXIF metadata repair</MonoEyebrow>
          <h1
            className="text-balance"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "clamp(2.6rem, 4.6vw, 4rem)",
              fontWeight: 600,
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              color: "var(--text)",
              margin: "22px 0 0",
            }}
          >
            Your scanner writes its own name into your film photos.
          </h1>

          <p
            className="text-pretty"
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--muted)",
              margin: "22px 0 0",
              maxWidth: 480,
            }}
          >
            We've all been there. Scanning images and seeing the scanner's name
            instead of your camera's in the metadata.
          </p>

          <p
            className="text-pretty"
            style={{
              fontSize: 18,
              lineHeight: 1.6,
              color: "var(--muted)",
              margin: "22px 0 0",
              maxWidth: 480,
            }}
          >
            ScanCorrect is a tool to rewrite the EXIF metadata in your scanned
            film photos.
          </p>

          <div
            className="hero-ctas"
            style={{
              display: "flex",
              gap: 10,
              marginTop: 34,
              flexWrap: "wrap",
            }}
          >
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
        <DiffCard />
      </div>
    </section>
  );
}

/* ---- product-forward: the app window ------------------------------------ */
export function AppWindow() {
  const thumbs = Array.from({ length: 8 });
  return (
    <section
      className="site-container"
      style={{ maxWidth: 1140, margin: "0 auto", padding: "24px 28px 96px" }}
    >
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
          background: "var(--app-surface)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
        }}
      >
        {/* titlebar */}
        <div
          style={{
            height: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 14px",
            background: "#ececec",
            borderBottom: "1px solid #dcdcdc",
          }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
          <span
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: "#555",
              marginRight: 52,
            }}
          >
            ScanCorrect
          </span>
        </div>
        {/* toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "6px 8px",
            padding: "9px 16px",
            borderBottom: "1px solid #e5e7eb",
            background: "#fff",
          }}
        >
          <span style={{ fontSize: 13, color: "#6b7280", whiteSpace: "nowrap" }}>
            8 images loaded
          </span>
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <span
              style={{
                fontSize: 13,
                color: "#6b7280",
                padding: "6px 12px",
                whiteSpace: "nowrap",
              }}
            >
              Discard All
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                background: "#3b82f6",
                padding: "6px 13px",
                borderRadius: 6,
                whiteSpace: "nowrap",
              }}
            >
              Save Changes (8)
            </span>
          </div>
        </div>
        <div className="app-body" style={{ display: "flex", minHeight: 300 }}>
          {/* grid */}
          <div
            className="app-grid"
            style={{
              flex: 1,
              minWidth: 0,
              padding: 16,
              background: "#f3f4f6",
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 12,
              alignContent: "start",
            }}
          >
            {thumbs.map((_, i) => (
              <div
                key={i}
                style={{
                  background: i === 1 ? "#eff6ff" : "#fff",
                  border: `2px solid ${i === 1 ? "#3b82f6" : "#fbbf24"}`,
                  borderRadius: 8,
                  padding: 9,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 3,
                      border:
                        "1.5px solid " + (i === 1 ? "#3b82f6" : "#cbd5e1"),
                      background: i === 1 ? "#3b82f6" : "#fff",
                    }}
                  />
                  <Icon
                    icon="mdi:scanner"
                    style={{ color: "#f59e0b", fontSize: 14 }}
                  />
                </div>
                <img
                  src="/film-thumb.png"
                  alt=""
                  style={{
                    width: "100%",
                    height: 52,
                    objectFit: "cover",
                    borderRadius: 4,
                    outline: "1px solid rgba(0,0,0,0.08)",
                    display: "block",
                  }}
                />
                <div
                  style={{
                    fontSize: 10.5,
                    color: "#374151",
                    marginTop: 6,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  HP5_2210{25 + i}.jpg
                </div>
                <div style={{ fontSize: 9.5, color: "#d97706", marginTop: 1 }}>
                  pending
                </div>
              </div>
            ))}
          </div>
          {/* sidebar */}
          <div
            className="app-sidebar"
            style={{
              width: 248,
              flexShrink: 0,
              borderLeft: "1px solid #e5e7eb",
              background: "#fff",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "#9ca3af",
              }}
            >
              Metadata
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#1f2937",
                margin: "4px 0 16px",
              }}
            >
              HP5_221026.jpg
            </div>
            {(
              [
                ["Camera Make", "Epson", "Pentax"],
                ["Camera Model", "Perfection V600", "ME Super"],
                ["Lens", "—", "50mm f/1.7"],
              ] as const
            ).map(([l, was, now]) => (
              <div key={l} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#374151",
                    marginBottom: 5,
                  }}
                >
                  {l}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 11.5,
                    marginBottom: 5,
                    color: "#9ca3af",
                  }}
                >
                  <span style={{ textDecoration: "line-through" }}>{was}</span>
                  <Icon icon="mdi:arrow-right" style={{ fontSize: 12 }} />
                  <span style={{ color: "#2563eb", fontWeight: 500 }}>
                    {now}
                  </span>
                </div>
                <div
                  style={{
                    border: "1px solid #3b82f6",
                    borderRadius: 6,
                    padding: "7px 10px",
                    fontSize: 13,
                    color: "#1f2937",
                  }}
                >
                  {now}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
