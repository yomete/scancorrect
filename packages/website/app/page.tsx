'use client';

import BeforeAfterSlider from "../components/BeforeAfterSlider";
import { Header } from "../components/Header";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-semibold leading-tight tracking-tight text-balance">
            Your scanner doesn't know your camera.
          </h1>
          <p className="mt-5 text-lg md:text-xl text-[#6b6560] leading-relaxed max-w-xl mx-auto text-pretty">
            ScanCorrect restores proper camera metadata to your film scans. Drag, drop, done.
          </p>
        </div>
      </section>

      {/* Before/After Slider */}
      <section className="px-6 py-12">
        <BeforeAfterSlider
          beforeImage="/before-new.png"
          afterImage="/after-new.png"
          beforeAlt="Before: Generic scanner EXIF data"
          afterAlt="After: Proper camera metadata"
        />
        <div className="text-center mt-8">
          <a
            href="#download"
            className="inline-block bg-[#1a1a1a] text-white px-8 py-3.5 rounded-full text-sm font-medium hover:bg-[#333] transition-colors"
          >
            Download Free
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-32">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-12">
            <div>
              <h3 className="text-xl font-serif font-semibold mb-2">Camera profiles</h3>
              <p className="text-[#6b6560] leading-relaxed">
                Save your cameras once. Nikon FM2, Leica M6, Mamiya 7 — create a profile for each body and lens, then apply it to hundreds of scans.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold mb-2">Batch processing</h3>
              <p className="text-[#6b6560] leading-relaxed">
                Drop an entire roll. Select your profile, drag 36 frames, click once. Your Epson V600 becomes a Nikon FM2 across every file.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-serif font-semibold mb-2">Works offline, no account</h3>
              <p className="text-[#6b6560] leading-relaxed">
                Everything runs locally on your Mac, Windows, or Linux machine. No cloud, no sign-up, no external dependencies. ExifTool is bundled.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Download / Footer */}
      <footer id="download" className="px-6 py-24 scroll-mt-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
            Download ScanCorrect
          </h2>
          <p className="text-[#6b6560] mb-10">
            Free. No account required. Works offline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <a href="#" className="bg-[#1a1a1a] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors">
              macOS
            </a>
            <a href="#" className="bg-[#1a1a1a] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors">
              Windows
            </a>
            <a href="#" className="bg-[#1a1a1a] text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-[#333] transition-colors">
              Linux
            </a>
          </div>
          <div className="border-t border-[#e5e0da] pt-8 text-sm text-[#6b6560]">
            ScanCorrect by Yomi Eluwande
          </div>
        </div>
      </footer>
    </div>
  );
}
