import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Fix Scanner Metadata on Your Film Scans (2025)',
  description:
    "Your film scans say 'Epson' instead of 'Nikon FM2.' Here's how to fix camera metadata on scanned film photos before importing to Lightroom or Capture One.",
};

export default function FixScannerMetadataGuide() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="pt-32 pb-20">
        <article className="max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
            How to Fix Scanner Metadata on Your Film Scans (2025)
          </h1>

          <div className="text-lg text-gray-700 leading-relaxed space-y-6">
            <p className="text-xl text-gray-800 font-medium">
              Your film scans say "Epson" instead of "Nikon FM2." Here's how to
              fix camera metadata on scanned film photos before importing to
              Lightroom or Capture One.
            </p>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                The Frustration Every Film Photographer Knows
              </h2>
              <p>
                You just got back your scans from the lab, or you finished
                scanning a roll at home. You shot the entire roll on your Leica
                M6, or maybe your trusty Nikon FM2. You carefully composed each
                frame, metered the light, and got the exposure just right.
              </p>
              <p>
                Then you import the scans into Lightroom or Capture One, and
                what does it say? "Epson Perfection V600." Or "Noritsu HS-1800."
                Or whatever scanner was used.
              </p>
              <p>
                Your beautiful film photographs are now tagged with the wrong
                camera. Your catalog is a mess. You can't filter by actual
                camera used. And when you share photos online, the EXIF data
                shows a scanner instead of the camera that actually captured the
                image.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                The Problem: Scanner Metadata Replaces Camera Info
              </h2>
              <p>
                Here's what happens: when you shoot film, your camera doesn't
                write EXIF data to the film itself. That's impossible. Film is
                an analog medium. There's no chip, no storage, no way to embed
                digital information.
              </p>
              <p>
                So when you scan that film, the scanner creates a digital file.
                And like any digital camera, it writes EXIF metadata to that
                file. But it writes its own information: the scanner make and
                model, the scan date, the scan resolution, and other technical
                details about the scanning process.
              </p>
              <p>
                The scanner has no way of knowing what camera you used, what
                lens was on the camera, what film stock you shot, or what your
                exposure settings were. All of that information is lost in the
                scanning process, replaced entirely by scanner metadata.
              </p>
              <p>
                This breaks organization in Lightroom, Capture One, Photo
                Mechanic, and every other digital asset management tool. Your
                film scans are categorized by scanner instead of camera. If you
                shoot with multiple film cameras, there's no way to tell them
                apart in your catalog.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                Why Lightroom and Capture One Can't Fix This
              </h2>
              <p>
                You might think: "I'll just edit the metadata in Lightroom. I
                can add keywords, I can add captions, so I should be able to
                change the camera info, right?"
              </p>
              <p>
                Wrong. Lightroom and Capture One treat EXIF camera data as
                read-only. You can add keywords, star ratings, color labels, and
                copyright information. But you cannot change what camera is
                recorded in the EXIF data. That field is locked.
              </p>
              <p>
                This makes sense for digital photography. If someone could
                easily change camera EXIF data, they could falsify which camera
                took a photo. For photojournalism and professional work,
                preserving original camera data is important.
              </p>
              <p>
                But for film photographers, this is a problem. The "original"
                camera data is wrong. It's not preserving the camera that took
                the photo. It's preserving the scanner that digitized it.
              </p>
              <p>
                The metadata is baked into the file itself, and your photo
                editing software won't let you change it. You need a different
                tool that can directly edit EXIF data at the file level, before
                you import your scans into your catalog.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                Your Options for Fixing Scanner Metadata
              </h2>
              <p>
                Several tools exist for editing EXIF data on scanned film
                photos. Here's an honest comparison of your options:
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                ExifTool (Command Line)
              </h3>
              <p>
                <a
                  href="https://exiftool.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  ExifTool
                </a>{' '}
                is the most powerful EXIF editing tool available. It's
                completely free and open source. It can read and write virtually
                every type of metadata in every image format.
              </p>
              <p>
                The catch: it's a command-line tool. You need to open Terminal
                (macOS/Linux) or Command Prompt (Windows) and type commands. For
                batch processing, you need to write scripts. For technical users
                who are comfortable with the terminal, this is a great option.
                For everyone else, it's a steep learning curve.
              </p>
              <p>
                Example command to change camera make and model:
              </p>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
                <code>
                  exiftool -Make="Nikon" -Model="FM2" -overwrite_original
                  *.jpg
                </code>
              </pre>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                AnalogExif
              </h3>
              <p>
                AnalogExif was a popular desktop application for fixing film
                scan metadata. It had a simple interface and worked well for
                many years.
              </p>
              <p>
                The problem: it hasn't been updated since 2014. It may not work
                on newer versions of macOS (especially Apple Silicon Macs) or
                Windows 10/11. The developer is no longer maintaining it. If you
                can get it to run on your system, it works fine. But for most
                modern computers, it's not a reliable option anymore.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                LensTagger
              </h3>
              <p>
                LensTagger is a Lightroom plugin that lets you add camera and
                lens information to your photos from within Lightroom. It works
                around Lightroom's read-only EXIF restrictions by writing custom
                metadata fields that Lightroom can read.
              </p>
              <p>
                This is Lightroom-specific. It won't work with Capture One,
                Photo Mechanic, or other DAM tools. And because it works within
                Lightroom, you're editing metadata after import, which means
                your original files still have incorrect scanner data.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                ScanCorrect
              </h3>
              <p>
                <a
                  href="/"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  ScanCorrect
                </a>{' '}
                is a modern desktop application designed specifically for film
                photographers who scan their own negatives or get scans from a
                lab.
              </p>
              <p>
                It provides a simple drag-and-drop interface. You create camera
                profiles with your actual camera make, model, and lens
                information. Then you drag your scanned images onto the app, and
                it writes the correct metadata to your files.
              </p>
              <p>
                It works on macOS, Windows, and Linux. It processes files before
                you import them to Lightroom or Capture One, so your catalog is
                correct from the start. You can save multiple camera profiles
                and switch between them instantly, which is perfect if you shoot
                with several different film cameras.
              </p>
              <p>
                It's free and open source, uses ExifTool under the hood for
                reliability, and requires no technical knowledge to use.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                Step-by-Step: Fixing Metadata with ScanCorrect
              </h2>
              <p>Here's how to fix scanner metadata using ScanCorrect:</p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                1. Download and Install ScanCorrect
              </h3>
              <p>
                Head to the{' '}
                <a
                  href="/#download"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  ScanCorrect download page
                </a>{' '}
                and download the version for your operating system (macOS,
                Windows, or Linux). Install it like any other desktop
                application.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                2. Create a Camera Profile
              </h3>
              <p>
                Open ScanCorrect. Click "New Profile" and enter your camera
                information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Camera Make (e.g., "Nikon")</li>
                <li>Camera Model (e.g., "FM2")</li>
                <li>Lens (optional, e.g., "Nikkor 50mm f/1.4")</li>
              </ul>
              <p>
                Save the profile. You can create as many profiles as you want
                for different cameras and lenses.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                3. Drag and Drop Your Scanned Images
              </h3>
              <p>
                Select the camera profile you want to use from the dropdown.
                Then drag and drop your scanned JPEG or TIFF files onto the app
                window. You can drop individual files or entire folders.
              </p>

              <h3 className="text-2xl font-semibold text-black mt-8 mb-3">
                4. Process and Save
              </h3>
              <p>
                Click "Process Images." ScanCorrect will update the EXIF data in
                each file, replacing the scanner information with your camera
                profile data. You'll see real-time feedback showing which files
                were processed successfully.
              </p>
              <p>
                That's it. Your scanned images now have the correct camera
                metadata embedded in the files themselves.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                Importing Your Corrected Scans to Lightroom or Capture One
              </h2>
              <p>
                Once you've fixed the metadata with ScanCorrect, you can import
                your scans into Lightroom or Capture One as you normally would.
              </p>
              <p>
                Your catalog will now show the correct camera make and model.
                You can filter your images by camera: "Show me all photos taken
                with my Leica M6." Or "Show me everything I shot with the Nikon
                FM2 and the 50mm f/1.4 lens."
              </p>
              <p>
                Your library is organized the way it should be: by the camera
                that actually captured the image, not by the scanner that
                digitized it.
              </p>
              <p>
                If you share images online or submit them to clients, the EXIF
                data now accurately represents the camera you used. No more
                explaining why your professional film work shows "Epson" as the
                camera.
              </p>
            </section>

            <section className="mt-12">
              <h2 className="text-3xl font-bold text-black mb-4">
                Get Your Film Scans Organized
              </h2>
              <p>
                Fixing scanner metadata is a small step that makes a huge
                difference in how you organize and manage your film photography.
                Instead of fighting with incorrect EXIF data, you can finally
                organize your scans by the camera you actually used.
              </p>
              <p>
                <a
                  href="/#download"
                  className="text-blue-600 hover:text-blue-800 underline font-semibold"
                >
                  Download ScanCorrect
                </a>{' '}
                and start fixing your film scan metadata today. It's free, it
                works offline, and it takes less than a minute to process an
                entire roll of film.
              </p>
            </section>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
