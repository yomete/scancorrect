import BeforeAfterSlider from "../components/BeforeAfterSlider";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center">
              <span className="text-xl">📷</span>
            </div>
            <span className="text-2xl font-bold text-white">
              ScanCorrect
            </span>
          </div>
          <div className="flex space-x-8">
            <button className="text-slate-400 hover:text-white px-4 py-2 font-medium transition-colors duration-200">
              Features
            </button>
            <button className="text-slate-400 hover:text-white px-4 py-2 font-medium transition-colors duration-200">
              GitHub
            </button>
            <button className="bg-slate-800 text-white px-8 py-3 rounded-xl font-semibold hover:bg-black hover:scale-105 transition-all duration-200 shadow-lg shadow-black/50">
              Download
            </button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <div className="max-w-5xl mx-auto">
          <p className="text-slate-400 mb-6 text-lg font-semibold tracking-wide uppercase">
            Introducing ScanCorrect
          </p>
          <h1 className="text-7xl md:text-8xl font-black text-white mb-10 leading-tight tracking-tight">
            Fix your film photos&apos; metadata instantly
          </h1>
          <p className="text-2xl text-slate-300 mb-16 max-w-4xl mx-auto leading-relaxed font-light">
            Transform generic scanner metadata into proper camera details. ScanCorrect
            gives you a beautiful drag-and-drop interface to fix camera metadata in
            your scanned film images, with powerful batch processing and no external
            dependencies.
          </p>
          <button className="bg-slate-800 text-white px-12 py-5 rounded-2xl text-xl font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-2xl shadow-black/50 hover:shadow-2xl hover:shadow-black/60">
            Download for Free
          </button>
        </div>
      </section>

      {/* Before/After Demo Section */}
      <section className="container mx-auto px-6 bg-slate-900 rounded-3xl">
        <div className="max-w-6xl mx-auto">
          {/* <div className="text-center mb-16">
            <h2 className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-6">
              See the transformation
            </h2>
            <p className="text-xl text-gray-600 font-light max-w-3xl mx-auto leading-relaxed">
              Watch how Film EXIF Editor transforms boring scanner metadata into proper camera details with just a drag and drop
            </p>
          </div> */}

          <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl shadow-black/50 border border-slate-700">
            <BeforeAfterSlider
              beforeImage="/before-new.png"
              afterImage="/after-new.png"
              beforeAlt="Before: Generic scanner EXIF data"
              afterAlt="After: Proper camera metadata"
            />
          </div>
        </div>
      </section>

      {/* Simple CTA Footer */}
      <section className="container mx-auto px-6 py-32 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-6xl font-bold text-white mb-8">
            Ready to fix your film photos?
          </h2>
          <p className="text-2xl text-slate-300 mb-16 font-light leading-relaxed">
            Download ScanCorrect and start transforming your scanned film
            images today.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-12">
            <button className="bg-slate-800 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/50">
              Download for macOS
            </button>
            <button className="bg-slate-800 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/50">
              Download for Windows
            </button>
            <button className="bg-slate-800 text-white px-10 py-5 rounded-2xl text-lg font-bold hover:bg-black hover:scale-105 transition-all duration-300 shadow-xl shadow-black/50">
              Download for Linux
            </button>
          </div>
          <div className="flex items-center justify-center space-x-8 text-slate-400">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="font-medium">Free and open source</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="font-medium">No account required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span className="font-medium">Works offline</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
