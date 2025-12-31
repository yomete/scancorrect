import BeforeAfterSlider from "../components/BeforeAfterSlider";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center">
              <span className="text-xl">📷</span>
            </div>
            <span className="text-2xl font-bold text-black">ScanCorrect</span>
          </div>
          <div className="flex space-x-8">
            <button className="text-slate-600 hover:text-black px-4 py-2 font-medium transition-colors duration-200">
              Features
            </button>
            <button className="text-slate-600 hover:text-black px-4 py-2 font-medium transition-colors duration-200">
              GitHub
            </button>
            <button className="bg-black text-white px-8 py-3 rounded-xl font-semibold hover:bg-slate-800 hover:scale-105 transition-all duration-200">
              Download
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="">
          <h1 className="text-5xl font-black text-black mb-4 leading-tight tracking-tight font-fjalla text-left">
            ScanCorrect
          </h1>
          <p className="text-2xl text-left text-slate-700 leading-relaxed font-light">
            Transform generic scanner metadata into proper camera details.
            ScanCorrect gives you a beautiful drag-and-drop interface to fix
            camera metadata in your scanned film images, with batch processing
            and no external dependencies.
          </p>
        </div>
      </section>

      {/* Before/After Demo Section */}
      <section className="container mx-auto px-6 rounded-3xl">
        <div className="bg-white rounded-2xl p-8 shadow-2xl border border-slate-200">
          <BeforeAfterSlider
            beforeImage="/before-new.png"
            afterImage="/after-new.png"
            beforeAlt="Before: Generic scanner EXIF data"
            afterAlt="After: Proper camera metadata"
          />
        </div>
      </section>

      {/* Simple CTA Footer */}
      <section className="container mx-auto px-6 py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-bold text-black mb-8">
            Ready to fix your film photos?
          </h2>
          <p className="text-2xl text-slate-700 mb-16 font-light leading-relaxed">
            Download ScanCorrect and start transforming your scanned film images
            today.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <button className="bg-black text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-slate-800 hover:scale-105 transition-all duration-300">
              Download for macOS
            </button>
            <button className="bg-black text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-slate-800 hover:scale-105 transition-all duration-300">
              Download for Windows
            </button>
            <button className="bg-black text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-slate-800 hover:scale-105 transition-all duration-300">
              Download for Linux
            </button>
          </div>
          <div className="flex items-center justify-center space-x-8 text-slate-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="font-medium">Free and open source</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="font-medium">No account required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-black rounded-full"></div>
              <span className="font-medium">Works offline</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
