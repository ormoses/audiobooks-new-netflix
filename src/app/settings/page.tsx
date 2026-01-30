import PageHeader from '@/components/PageHeader';
import ImportSection from '@/components/ImportSection';
import ExportSection from '@/components/ExportSection';
import CoverExtractionSection from '@/components/CoverExtractionSection';
import { getAppMeta } from '@/lib/db';
import { isProduction } from '@/lib/env';

export default async function SettingsPage() {
  // Fetch last CSV path and import timestamp from database
  const lastCsvPath = await getAppMeta('last_csv_path');
  const lastImportAt = await getAppMeta('last_import_at');
  const isProd = isProduction();

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your library and preferences"
      />

      <div className="max-w-2xl space-y-8">
        {/* Import Section - Only show in local mode */}
        {!isProd ? (
          <ImportSection
            initialCsvPath={lastCsvPath}
            lastImportAt={lastImportAt}
          />
        ) : (
          <section className="bg-netflix-dark rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              CSV Import
            </h2>
            <p className="text-netflix-light-gray">
              CSV Import is available only in Local mode.
            </p>
            <p className="text-netflix-light-gray text-sm mt-2">
              To import data, run the following command from your local PC:
            </p>
            <code className="block bg-netflix-gray rounded px-3 py-2 mt-2 text-sm text-green-400 font-mono">
              npm run import:cloud -- --csv "C:\path\to\your\file.csv"
            </code>
          </section>
        )}

        {/* Export Section - Always available */}
        <ExportSection />

        {/* Cover Extraction Section - Only show in local mode */}
        {!isProd ? (
          <CoverExtractionSection />
        ) : (
          <section className="bg-netflix-dark rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              Cover Extraction
            </h2>
            <p className="text-netflix-light-gray">
              Cover extraction is not available in Cloud mode.
            </p>
            <p className="text-netflix-light-gray text-sm mt-2">
              Vercel does not have persistent filesystem storage. Extract covers locally before deploying.
            </p>
          </section>
        )}

        {/* About Section */}
        <section className="bg-netflix-dark rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            About
          </h2>
          <p className="text-netflix-light-gray">
            AudioBooks Catalog v0.4.0
          </p>
          <p className="text-netflix-light-gray text-sm mt-2">
            A Netflix-style audiobook discovery and tracking app.
            Browse your library, track what you're listening to,
            and rate books and narrators.
          </p>
          {isProd && (
            <p className="text-netflix-light-gray text-xs mt-2">
              Running in Cloud mode (Turso database)
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
