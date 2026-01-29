import PageHeader from '@/components/PageHeader';
import ImportSection from '@/components/ImportSection';
import { getAppMeta } from '@/lib/db';

export default async function SettingsPage() {
  // Fetch last CSV path and import timestamp from database
  const lastCsvPath = await getAppMeta('last_csv_path');
  const lastImportAt = await getAppMeta('last_import_at');

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your library and preferences"
      />

      <div className="max-w-2xl space-y-8">
        {/* Import Section */}
        <ImportSection
          initialCsvPath={lastCsvPath}
          lastImportAt={lastImportAt}
        />

        {/* Export Section (placeholder for Step 5) */}
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
            AudioBooks Catalog v0.2.0
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
