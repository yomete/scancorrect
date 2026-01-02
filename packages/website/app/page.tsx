'use client';

import BeforeAfterSlider from "../components/BeforeAfterSlider";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import FeatureCard from "../components/FeatureCard";
import PricingCard from "../components/PricingCard";
import StepCard from "../components/StepCard";
import WorkflowCard from "../components/WorkflowCard";
import VideoPlaceholder from "../components/VideoPlaceholder";

export default function Home() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 pt-32">
        <div className="max-w-4xl">
          <h1 className="text-6xl md:text-7xl font-black text-black mb-6 leading-tight tracking-tight font-fjalla">
            ScanCorrect
          </h1>
          <p className="text-xl md:text-2xl text-slate-700 leading-relaxed mb-8">
            Transform generic scanner metadata into proper camera details. ScanCorrect gives you a beautiful drag-and-drop interface to fix camera metadata in your scanned film images, with batch processing and no external dependencies.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => scrollToSection('download')}
              className="bg-black text-white px-8 py-4 rounded-lg font-bold hover:bg-gray-800 transition-all duration-300 hover:scale-105"
            >
              Download Free
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="bg-white text-black border-2 border-black px-8 py-4 rounded-lg font-bold hover:bg-black hover:text-white transition-all duration-300"
            >
              See How It Works
            </button>
          </div>
        </div>
      </section>

      {/* Before/After Demo Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-200">
          <BeforeAfterSlider
            beforeImage="/before-new.png"
            afterImage="/after-new.png"
            beforeAlt="Before: Generic scanner EXIF data"
            afterAlt="After: Proper camera metadata"
          />
        </div>
      </section>

      {/* The Problem Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 font-fjalla">
            Your scanner doesn't know your camera
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-4">
            When you scan film, your scanner writes its own make and model into the EXIF data.
            Your Nikon FM2 becomes an "Epson V600". Your Leica M6 becomes a "Plustek OpticFilm 8200i".
            Your carefully catalogued film archive becomes unsearchable by the cameras you actually used.
          </p>
          <p className="text-2xl font-bold text-black mt-8 font-fjalla">
            ScanCorrect fixes that.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-6 py-24 bg-gray-50 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 text-center font-fjalla">
            Everything you need to fix your scans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
            <FeatureCard
              icon={
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <rect x="12" y="12" width="40" height="40" rx="4" stroke="black" strokeWidth="3"/>
                  <circle cx="32" cy="32" r="12" stroke="black" strokeWidth="3"/>
                  <circle cx="32" cy="32" r="6" fill="black"/>
                </svg>
              }
              title="Camera Profiles"
              description="Save your cameras once, apply to hundreds of scans. Create profiles for each camera and lens combo you own."
            />
            <FeatureCard
              icon={
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <rect x="8" y="16" width="16" height="16" stroke="black" strokeWidth="3"/>
                  <rect x="28" y="16" width="16" height="16" stroke="black" strokeWidth="3"/>
                  <rect x="48" y="16" width="8" height="16" stroke="black" strokeWidth="3"/>
                  <rect x="8" y="36" width="16" height="16" stroke="black" strokeWidth="3"/>
                  <rect x="28" y="36" width="16" height="16" stroke="black" strokeWidth="3"/>
                  <rect x="48" y="36" width="8" height="16" stroke="black" strokeWidth="3"/>
                </svg>
              }
              title="Batch Processing"
              description="Process an entire roll in one drag-and-drop. Select your profile, drop 36 frames, done."
            />
            <FeatureCard
              icon={
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <path d="M32 12 L32 28" stroke="black" strokeWidth="3" strokeLinecap="round"/>
                  <circle cx="32" cy="38" r="14" stroke="black" strokeWidth="3"/>
                  <path d="M32 30 L32 38 L38 44" stroke="black" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              }
              title="Scanner Detection"
              description="Automatically flags scans that need fixing. Detects Epson, Plustek, Nikon, and other common scanner metadata."
            />
            <FeatureCard
              icon={
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="20" stroke="black" strokeWidth="3"/>
                  <circle cx="32" cy="28" r="6" fill="black"/>
                  <path d="M32 34 Q26 42 20 48 M32 34 Q38 42 44 48" stroke="black" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              }
              title="Location Tagging"
              description="Add where you shot it, not where you scanned it. Search for places and batch-apply GPS coordinates."
            />
            <FeatureCard
              icon={
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <rect x="16" y="12" width="32" height="40" rx="2" stroke="black" strokeWidth="3"/>
                  <path d="M24 22 L40 22 M24 30 L40 30 M24 38 L32 38" stroke="black" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              }
              title="Film Stock & Exposure"
              description="Tag your Portra 400, your Tri-X, your HP5. Add ISO, aperture, shutter speed — all the metadata your scanner can't know."
            />
            <FeatureCard
              icon={
                <svg className="w-16 h-16" viewBox="0 0 64 64" fill="none">
                  <path d="M24 32 L28 36 L40 24" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M52 32 A20 20 0 1 1 32 12" stroke="black" strokeWidth="3" strokeLinecap="round"/>
                  <path d="M44 12 L52 12 L52 20" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              title="Safe & Undoable"
              description="Every change creates a backup. Made a mistake? Undo any edit from the processing history."
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="container mx-auto px-6 py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 text-center font-fjalla">
            Works with your workflow
          </h2>
          <p className="text-xl text-gray-600 text-center mb-12">
            Fix your metadata before import. No plugins to install, no command line to learn.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <WorkflowCard
              app="lightroom"
              title="Lightroom Classic"
              description="Process your scans with ScanCorrect before importing to Lightroom. Your camera filters will finally work on film scans."
              smallText="Works with Lightroom Classic 2015 and later"
            />
            <WorkflowCard
              app="captureone"
              title="Capture One"
              description="Fix metadata before adding to your Capture One catalog. Search and filter by the cameras you actually used."
              smallText="Compatible with Capture One 20 and later"
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="container mx-auto px-6 py-24 bg-gray-50 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-16 text-center font-fjalla">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
            <StepCard
              number={1}
              title="Create Profiles"
              description="Add your cameras once. Name them, set the make and model, add lens info if you want."
            />
            <StepCard
              number={2}
              title="Drop Your Scans"
              description="Drag a folder of scans onto the app. ScanCorrect shows you which ones have scanner metadata."
            />
            <StepCard
              number={3}
              title="Apply & Done"
              description="Pick a profile, click apply. Your scans now have proper camera metadata."
            />
          </div>
          <div className="max-w-3xl mx-auto">
            <VideoPlaceholder />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-24 scroll-mt-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-black mb-4 text-center font-fjalla">
            Simple pricing
          </h2>
          <p className="text-xl text-gray-600 text-center mb-16">
            Start free. Upgrade when you need more.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <PricingCard
              tier="free"
              price="€0"
              period="forever"
              features={[
                "Fix camera make and model",
                "Unlimited profiles",
                "Batch processing",
                "Scanner detection",
                "Works offline",
                "No account required"
              ]}
              cta="Download Free"
              ctaAction={() => scrollToSection('download')}
            />
            <PricingCard
              tier="pro"
              price="€5"
              period="/month or €25 once"
              features={[
                "Everything in Free",
                "Location tagging with search",
                "Film stock metadata",
                "Exposure settings (ISO, aperture, shutter)",
                "Processing history & undo",
                "Priority support"
              ]}
              cta="Get Pro"
              ctaAction={() => {}}
              highlighted={true}
              badge="Most Popular"
            />
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="container mx-auto px-6 py-24 bg-gray-50 scroll-mt-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold text-black mb-6 font-fjalla">
            Ready to fix your film photos?
          </h2>
          <p className="text-xl text-gray-700 mb-12 leading-relaxed">
            Download ScanCorrect for free. No account required, works offline.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <a
              href="#"
              className="bg-black text-white px-10 py-5 rounded-lg text-lg font-bold hover:bg-gray-800 hover:scale-105 transition-all duration-300 inline-block"
            >
              Download for macOS
            </a>
            <a
              href="#"
              className="bg-black text-white px-10 py-5 rounded-lg text-lg font-bold hover:bg-gray-800 hover:scale-105 transition-all duration-300 inline-block"
            >
              Download for Windows
            </a>
            <a
              href="#"
              className="bg-black text-white px-10 py-5 rounded-lg text-lg font-bold hover:bg-gray-800 hover:scale-105 transition-all duration-300 inline-block"
            >
              Download for Linux
            </a>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8 text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="font-medium">No account required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="font-medium">Works offline</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="font-medium">Free tier available</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
