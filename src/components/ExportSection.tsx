'use client';

import { useState } from 'react';
import { useToast } from './Toast';

export default function ExportSection() {
  const [exporting, setExporting] = useState(false);
  const { showToast } = useToast();

  const handleExport = async () => {
    setExporting(true);

    try {
      // Trigger download
      const response = await fetch('/api/export');

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'audiobook_export.csv';

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Library exported successfully', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export library', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="bg-netflix-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Export Data</h2>
      <p className="text-netflix-light-gray mb-4">
        Export your library data including ratings, status, and notes to a CSV file.
        The export is Excel-compatible with full Unicode support.
      </p>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-4 py-2 bg-netflix-red hover:bg-netflix-red-hover text-white font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {exporting ? 'Exporting...' : 'Export to CSV'}
      </button>
    </section>
  );
}
