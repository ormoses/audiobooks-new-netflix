import PageHeader from '@/components/PageHeader';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your library and preferences"
      />

      <div className="max-w-2xl space-y-8">
        {/* Import Section */}
        <section className="bg-netflix-dark rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Import Library
          </h2>
          <p className="text-netflix-light-gray mb-4">
            Import your audiobook catalog from a CSV file. This will populate
            your library with book metadata.
          </p>
          <div className="bg-netflix-gray/50 rounded-md p-4 text-center text-netflix-light-gray">
            CSV import will be available in Step 2
          </div>
        </section>

        {/* Export Section */}
        <section className="bg-netflix-dark rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Export Data
          </h2>
          <p className="text-netflix-light-gray mb-4">
            Export your library data including ratings and listening status.
          </p>
          <div className="bg-netflix-gray/50 rounded-md p-4 text-center text-netflix-light-gray">
            Export will be available in Step 5
          </div>
        </section>

        {/* About Section */}
        <section className="bg-netflix-dark rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            About
          </h2>
          <p className="text-netflix-light-gray">
            AudioBooks Catalog v0.1.0
          </p>
          <p className="text-netflix-light-gray text-sm mt-2">
            A Netflix-style audiobook discovery and tracking app.
            Browse your library, track what you're listening to,
            and rate books and narrators.
          </p>
        </section>
      </div>
    </div>
  );
}
