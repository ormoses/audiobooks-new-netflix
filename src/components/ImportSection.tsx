'use client';

import { useState } from 'react';
import { useToast } from './Toast';
import { ImportSummary } from '@/lib/types';
import { formatDate } from '@/lib/formatters';

interface ImportSectionProps {
  initialCsvPath: string | null;
  lastImportAt: string | null;
}

export default function ImportSection({ initialCsvPath, lastImportAt }: ImportSectionProps) {
  const [csvPath, setCsvPath] = useState(initialCsvPath || '');
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const [importResult, setImportResult] = useState<{ ok: boolean; summary?: ImportSummary; error?: string } | null>(null);
  const [lastImport, setLastImport] = useState(lastImportAt);

  const { showToast } = useToast();

  const handleValidate = async () => {
    if (!csvPath.trim()) {
      showToast('Please enter a CSV file path', 'error');
      return;
    }

    setValidating(true);
    setValidationResult(null);
    setImportResult(null);

    try {
      const response = await fetch('/api/csv/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: csvPath }),
      });

      const result = await response.json();
      setValidationResult(result);

      if (result.ok) {
        showToast('CSV file is valid and ready to import', 'success');
      } else {
        showToast(result.error || 'Validation failed', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to validate';
      setValidationResult({ ok: false, error: errorMsg });
      showToast(errorMsg, 'error');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!csvPath.trim()) {
      showToast('Please enter a CSV file path', 'error');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/csv/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: csvPath }),
      });

      const result = await response.json();
      setImportResult(result);

      if (result.ok && result.summary) {
        const { inserted, updated, skipped, errors } = result.summary;
        showToast(
          `Import complete: ${inserted} new, ${updated} updated, ${skipped} skipped, ${errors} errors`,
          errors > 0 ? 'info' : 'success'
        );
        setLastImport(new Date().toISOString());
      } else {
        showToast(result.error || 'Import failed', 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to import';
      setImportResult({ ok: false, error: errorMsg });
      showToast(errorMsg, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="bg-netflix-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Import Library</h2>
      <p className="text-netflix-light-gray mb-4">
        Import your audiobook catalog from a CSV file. This will add new books and update existing ones.
      </p>

      {/* Last import info */}
      {lastImport && (
        <p className="text-sm text-netflix-light-gray/70 mb-4">
          Last imported: {formatDate(lastImport)}
        </p>
      )}

      {/* CSV path input */}
      <div className="space-y-4">
        <div>
          <label htmlFor="csv-path" className="block text-sm font-medium text-netflix-light-gray mb-2">
            CSV File Path
          </label>
          <input
            id="csv-path"
            type="text"
            value={csvPath}
            onChange={(e) => {
              setCsvPath(e.target.value);
              setValidationResult(null);
              setImportResult(null);
            }}
            placeholder="C:\path\to\audiobook_index_series_verified.csv"
            className="w-full px-4 py-3 bg-netflix-gray border border-netflix-gray rounded-md text-white placeholder-netflix-light-gray/50 focus:outline-none focus:border-netflix-light-gray focus:ring-1 focus:ring-netflix-light-gray"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            disabled={validating || importing || !csvPath.trim()}
            className="px-4 py-2 bg-netflix-gray hover:bg-netflix-light-gray/20 text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {validating ? 'Validating...' : 'Validate'}
          </button>

          <button
            onClick={handleImport}
            disabled={validating || importing || !csvPath.trim()}
            className="px-4 py-2 bg-netflix-red hover:bg-netflix-red-hover text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
        </div>

        {/* Validation result */}
        {validationResult && (
          <div
            className={`p-3 rounded-md text-sm ${
              validationResult.ok
                ? 'bg-green-900/30 text-green-400 border border-green-800'
                : 'bg-red-900/30 text-red-400 border border-red-800'
            }`}
          >
            {validationResult.ok ? 'CSV file is valid!' : validationResult.error}
          </div>
        )}

        {/* Import result */}
        {importResult && (
          <div
            className={`p-4 rounded-md text-sm ${
              importResult.ok
                ? 'bg-green-900/30 border border-green-800'
                : 'bg-red-900/30 text-red-400 border border-red-800'
            }`}
          >
            {importResult.ok && importResult.summary ? (
              <div className="space-y-1">
                <p className="text-green-400 font-medium">Import Successful!</p>
                <ul className="text-netflix-light-gray space-y-0.5">
                  <li>Total rows: {importResult.summary.totalRows}</li>
                  <li className="text-green-400">Inserted: {importResult.summary.inserted}</li>
                  <li className="text-blue-400">Updated: {importResult.summary.updated}</li>
                  <li className="text-yellow-400">Skipped: {importResult.summary.skipped}</li>
                  {importResult.summary.markedMissing > 0 && (
                    <li className="text-orange-400">Marked missing: {importResult.summary.markedMissing}</li>
                  )}
                  {importResult.summary.errors > 0 && (
                    <li className="text-red-400">Errors: {importResult.summary.errors}</li>
                  )}
                </ul>
              </div>
            ) : (
              importResult.error
            )}
          </div>
        )}
      </div>
    </section>
  );
}
