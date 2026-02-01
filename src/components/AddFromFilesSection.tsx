'use client';

import { useState, useCallback } from 'react';
import { ScannedBookCandidate, ReviewedBookCandidate } from '@/lib/types';
import { useToast } from './Toast';

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format duration to human readable
function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Truncate path for display
function truncatePath(p: string, maxLen: number = 50): string {
  if (p.length <= maxLen) return p;
  return '...' + p.slice(-maxLen + 3);
}

interface EditableCandidateRowProps {
  candidate: ScannedBookCandidate;
  onChange: (updated: ScannedBookCandidate) => void;
}

function EditableCandidateRow({ candidate, onChange }: EditableCandidateRowProps) {
  const handleFieldChange = (field: keyof ScannedBookCandidate, value: string | boolean | null) => {
    onChange({ ...candidate, [field]: value });
  };

  const handleDecisionChange = (decision: 'single' | 'multiple') => {
    onChange({ ...candidate, userDecision: decision });
  };

  const needsDecision = candidate.multipleM4bFiles && !candidate.userDecision;

  return (
    <tr className={`border-b border-netflix-gray/30 ${!candidate.selected ? 'opacity-50' : ''}`}>
      {/* Select checkbox */}
      <td className="p-2">
        <input
          type="checkbox"
          checked={candidate.selected}
          onChange={(e) => handleFieldChange('selected', e.target.checked)}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-netflix-red focus:ring-netflix-red"
        />
      </td>

      {/* Title (editable) - larger for readability */}
      <td className="p-2 min-w-[320px]">
        <input
          type="text"
          value={candidate.title}
          onChange={(e) => handleFieldChange('title', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-base md:text-lg text-white h-11"
          disabled={!candidate.selected}
        />
      </td>

      {/* Author (editable) - larger for readability */}
      <td className="p-2 min-w-[240px]">
        <input
          type="text"
          value={candidate.author || ''}
          onChange={(e) => handleFieldChange('author', e.target.value || null)}
          placeholder="—"
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-base md:text-lg text-white placeholder-gray-500 h-11"
          disabled={!candidate.selected}
        />
      </td>

      {/* Series (editable) */}
      <td className="p-2">
        <input
          type="text"
          value={candidate.series || ''}
          onChange={(e) => handleFieldChange('series', e.target.value || null)}
          placeholder="—"
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
          disabled={!candidate.selected}
        />
      </td>

      {/* Book # (editable) */}
      <td className="p-2">
        <input
          type="text"
          value={candidate.seriesBookNumber || ''}
          onChange={(e) => handleFieldChange('seriesBookNumber', e.target.value || null)}
          placeholder="—"
          className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500 text-center"
          disabled={!candidate.selected}
        />
      </td>

      {/* Narrator (editable) */}
      <td className="p-2">
        <input
          type="text"
          value={candidate.narrator || ''}
          onChange={(e) => handleFieldChange('narrator', e.target.value || null)}
          placeholder="—"
          className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white placeholder-gray-500"
          disabled={!candidate.selected}
        />
      </td>

      {/* Duration (read-only) */}
      <td className="p-2 text-sm text-gray-400 text-right whitespace-nowrap">
        {formatDuration(candidate.durationSeconds)}
      </td>

      {/* Size (read-only) */}
      <td className="p-2 text-sm text-gray-400 text-right whitespace-nowrap">
        {formatBytes(candidate.totalSizeBytes)}
      </td>

      {/* Files (read-only) */}
      <td className="p-2 text-sm text-gray-400 text-center">
        {candidate.fileCount}
      </td>

      {/* Cover (read-only) */}
      <td className="p-2 text-center">
        {candidate.hasEmbeddedCover ? (
          <span className="text-green-400">✓</span>
        ) : (
          <span className="text-gray-500">✗</span>
        )}
      </td>

      {/* Status / Warnings */}
      <td className="p-2">
        <div className="flex flex-col gap-1">
          {candidate.existsInDb && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-600/30 text-blue-300 rounded">
              exists
            </span>
          )}
          {needsDecision && (
            <div className="flex flex-col gap-1">
              <span className="text-xs px-1.5 py-0.5 bg-orange-600/30 text-orange-300 rounded">
                {candidate.m4bFileCount} .m4b files
              </span>
              <select
                value={candidate.userDecision || ''}
                onChange={(e) => handleDecisionChange(e.target.value as 'single' | 'multiple')}
                className="text-xs bg-gray-800 border border-orange-500 rounded px-1 py-0.5 text-white"
              >
                <option value="">Choose...</option>
                <option value="single">ONE book (multi-part)</option>
                <option value="multiple">MULTIPLE books</option>
              </select>
            </div>
          )}
          {candidate.warnings.filter(w => !w.includes('user decision')).map((w, i) => (
            <span key={i} className="text-xs px-1.5 py-0.5 bg-yellow-600/30 text-yellow-300 rounded">
              {w}
            </span>
          ))}
        </div>
      </td>

      {/* Path (read-only, truncated) */}
      <td className="p-2 text-xs text-gray-500" title={candidate.path}>
        {truncatePath(candidate.path, 40)}
      </td>
    </tr>
  );
}

export default function AddFromFilesSection() {
  const { showToast } = useToast();

  // Form state
  const [folderPath, setFolderPath] = useState('');
  const [recursive, setRecursive] = useState(true);
  const [maxDepth, setMaxDepth] = useState(5);

  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [candidates, setCandidates] = useState<ScannedBookCandidate[]>([]);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);

  // Commit state
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{
    inserted: number;
    updated: number;
    errors: number;
    coversExtracted: number;
    coversUploaded: number;
  } | null>(null);

  // Handle scan
  const handleScan = useCallback(async () => {
    if (!folderPath.trim()) {
      showToast('Please enter a folder path', 'error');
      return;
    }

    setIsScanning(true);
    setCandidates([]);
    setScanWarnings([]);
    setCommitResult(null);

    try {
      const response = await fetch('/api/files/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderPath: folderPath.trim(),
          recursive,
          maxDepth,
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setCandidates(data.candidates || []);
        setScanWarnings(data.warnings || []);

        if (data.candidates?.length === 0) {
          showToast('No audiobooks found in the specified folder', 'error');
        } else {
          showToast(`Found ${data.candidates.length} audiobook(s)`, 'success');
        }
      } else {
        showToast(data.error || 'Scan failed', 'error');
      }
    } catch (error) {
      console.error('Scan error:', error);
      showToast('Scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  }, [folderPath, recursive, maxDepth, showToast]);

  // Handle candidate update
  const handleCandidateChange = useCallback((updated: ScannedBookCandidate) => {
    setCandidates(prev =>
      prev.map(c => (c.id === updated.id ? updated : c))
    );
  }, []);

  // Select/deselect all
  const handleSelectAll = useCallback((selected: boolean) => {
    setCandidates(prev => prev.map(c => ({ ...c, selected })));
  }, []);

  // Handle commit
  const handleCommit = useCallback(async () => {
    const selectedCandidates = candidates.filter(c => c.selected);

    if (selectedCandidates.length === 0) {
      showToast('No books selected for import', 'error');
      return;
    }

    // Check for pending decisions
    const pendingDecisions = selectedCandidates.filter(
      c => c.multipleM4bFiles && !c.userDecision
    );
    if (pendingDecisions.length > 0) {
      showToast(
        `${pendingDecisions.length} folder(s) need a decision about multiple .m4b files`,
        'error'
      );
      return;
    }

    setIsCommitting(true);
    setCommitResult(null);

    try {
      // Convert to ReviewedBookCandidate format
      const books: ReviewedBookCandidate[] = selectedCandidates.map(c => ({
        path: c.path,
        type: c.type,
        title: c.title,
        author: c.author,
        narrator: c.narrator,
        series: c.series,
        seriesBookNumber: c.seriesBookNumber,
        durationSeconds: c.durationSeconds,
        totalSizeBytes: c.totalSizeBytes,
        fileCount: c.fileCount,
        hasEmbeddedCover: c.hasEmbeddedCover,
        multipleM4bFiles: c.multipleM4bFiles,
        userDecision: c.userDecision || undefined,
        m4bFilePaths: c.m4bFilePaths,
      }));

      const response = await fetch('/api/files/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ books }),
      });

      if (response.status === 401) {
        showToast('Please login to import books', 'error');
        return;
      }

      const data = await response.json();

      if (data.ok && data.summary) {
        setCommitResult(data.summary);
        showToast(
          `Imported ${data.summary.inserted} new, updated ${data.summary.updated}`,
          'success'
        );
        // Clear the candidates after successful import
        setCandidates([]);
      } else {
        showToast(data.error || 'Import failed', 'error');
      }
    } catch (error) {
      console.error('Commit error:', error);
      showToast('Import failed', 'error');
    } finally {
      setIsCommitting(false);
    }
  }, [candidates, showToast]);

  const selectedCount = candidates.filter(c => c.selected).length;
  const pendingDecisionCount = candidates.filter(
    c => c.selected && c.multipleM4bFiles && !c.userDecision
  ).length;

  return (
    <section className="bg-netflix-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-2">
        Add from Files
      </h2>
      <p className="text-netflix-light-gray text-sm mb-4">
        Scan a folder on your local PC to detect audiobooks and import them.
      </p>

      {/* Scan form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Folder Path
          </label>
          <input
            type="text"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            placeholder="C:\Audiobooks or /home/user/audiobooks"
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-3 min-h-[48px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-netflix-red focus:ring-netflix-red"
            />
            Scan subfolders
          </label>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-300">Max depth:</label>
            <input
              type="number"
              value={maxDepth}
              onChange={(e) => setMaxDepth(parseInt(e.target.value) || 5)}
              min={1}
              max={10}
              className="w-16 bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={isScanning || !folderPath.trim()}
          className={`
            px-6 py-3 rounded-lg font-semibold min-h-[48px] transition-colors
            ${isScanning || !folderPath.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
            }
          `}
        >
          {isScanning ? 'Scanning...' : 'Scan'}
        </button>
      </div>

      {/* Scan warnings */}
      {scanWarnings.length > 0 && (
        <div className="mb-4 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
          <p className="text-sm text-yellow-300 font-medium mb-1">Scan Warnings:</p>
          <ul className="text-xs text-yellow-200 list-disc list-inside">
            {scanWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Candidates table */}
      {candidates.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-white">
              Found {candidates.length} audiobook(s)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => handleSelectAll(true)}
                className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Select All
              </button>
              <button
                onClick={() => handleSelectAll(false)}
                className="px-3 py-1 text-sm bg-gray-700 text-white rounded hover:bg-gray-600"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1400px]">
              <thead className="text-xs text-gray-400 uppercase bg-gray-800/50">
                <tr>
                  <th className="p-2 w-8">☑</th>
                  <th className="p-2 min-w-[320px]">Title</th>
                  <th className="p-2 min-w-[240px]">Author</th>
                  <th className="p-2">Series</th>
                  <th className="p-2 w-16">#</th>
                  <th className="p-2">Narrator</th>
                  <th className="p-2 text-right">Duration</th>
                  <th className="p-2 text-right">Size</th>
                  <th className="p-2 text-center">Files</th>
                  <th className="p-2 text-center">Cover</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Path</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <EditableCandidateRow
                    key={candidate.id}
                    candidate={candidate}
                    onChange={handleCandidateChange}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Import button */}
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleCommit}
              disabled={isCommitting || selectedCount === 0 || pendingDecisionCount > 0}
              className={`
                px-6 py-3 rounded-lg font-semibold min-h-[48px] transition-colors
                ${isCommitting || selectedCount === 0 || pendingDecisionCount > 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-netflix-red text-white hover:bg-red-700'
                }
              `}
            >
              {isCommitting ? 'Importing...' : `Import ${selectedCount} Selected`}
            </button>

            {pendingDecisionCount > 0 && (
              <span className="text-sm text-orange-400">
                {pendingDecisionCount} folder(s) need a decision about multiple .m4b files
              </span>
            )}
          </div>
        </div>
      )}

      {/* Commit result */}
      {commitResult && (
        <div className="mt-4 p-4 bg-green-600/20 border border-green-600/50 rounded-lg">
          <h4 className="text-green-300 font-medium mb-2">Import Complete</h4>
          <ul className="text-sm text-green-200 space-y-1">
            <li>Inserted: {commitResult.inserted}</li>
            <li>Updated: {commitResult.updated}</li>
            {commitResult.errors > 0 && (
              <li className="text-red-300">Errors: {commitResult.errors}</li>
            )}
            <li>Covers extracted: {commitResult.coversExtracted}</li>
            <li>Covers uploaded to cloud: {commitResult.coversUploaded}</li>
          </ul>
        </div>
      )}
    </section>
  );
}
