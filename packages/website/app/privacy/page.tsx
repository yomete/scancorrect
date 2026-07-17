import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — ScanCorrect',
  description:
    'What ScanCorrect sends over the network, and what it never does: no analytics, no accounts, no telemetry.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-32 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight text-balance">
            Privacy
          </h1>

          <div className="text-lg text-gray-700 leading-relaxed space-y-6 text-pretty">
            <p className="text-xl text-gray-800 font-medium">
              ScanCorrect processes your photos locally. Your images never
              leave your machine.
            </p>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                What stays on your machine
              </h2>
              <p>
                Reading and writing EXIF metadata, managing camera profiles,
                and matching GPX tracks to photos all happen locally on your
                computer. ScanCorrect never uploads your image files or the
                metadata inside them to any server.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                What does leave your machine
              </h2>
              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                Location search / reverse geocoding
              </h3>
              <p>
                When you search for a place name or reverse-geocode a set of
                coordinates while assigning a location to a camera profile,
                the coordinates or place text you enter are sent to{' '}
                <a
                  href="https://nominatim.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  OpenStreetMap Nominatim
                </a>
                . OpenStreetMap's own privacy policy applies to that request.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                Map picker
              </h3>
              <p>
                When you use the interactive map picker, map tiles and place
                search requests are sent to Mapbox using the token configured
                in your settings. Mapbox's privacy policy applies to that
                request.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                Update checks
              </h3>
              <p>
                ScanCorrect checks GitHub for new releases so it can offer to
                auto-update. That check transmits your current app version.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                What ScanCorrect doesn't do
              </h2>
              <p>
                No analytics, no accounts, no telemetry beyond the network
                calls described above.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                Questions
              </h2>
              <p>
                Open an issue on{' '}
                <a
                  href="https://github.com/yomete/film-exif-editor/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  GitHub
                </a>{' '}
                if you have questions about how ScanCorrect handles data.
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
