export function Footer() {
  return (
    <footer className="border-t border-gray-200 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900 mb-2">
            Built by a film photographer
          </p>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto text-pretty">
            Made by Yomi Eluwande — shooting film, scanning at home, and tired
            of metadata that says "Epson."
          </p>
          <p className="text-sm mt-4">
            <a
              href="/privacy"
              className="text-gray-500 hover:text-gray-700 underline"
            >
              Privacy
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
