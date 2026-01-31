'use client';

import { useState } from 'react';
import { CoverUploadResponse } from '@/lib/types';
import { useAuth } from './AuthProvider';
import { useToast } from './Toast';

export default function CoverUploadSection() {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<CoverUploadResponse | null>(null);

  const handleUpload = async () => {
    if (!isAuthenticated) {
      showToast('Please login to upload covers', 'error');
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const response = await fetch('/api/covers/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data: CoverUploadResponse = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Upload failed', 'error');
        setResult(data);
        return;
      }

      setResult(data);
      if (data.uploaded > 0) {
        showToast(`Uploaded ${data.uploaded} covers to cloud`, 'success');
      } else if (data.processed === 0) {
        showToast('No covers need uploading', 'info');
      } else {
        showToast('Upload complete', 'success');
      }
    } catch (error) {
      showToast('Upload failed', 'error');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="bg-netflix-dark rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-2">
        Upload Covers to Cloud
      </h2>
      <p className="text-netflix-light-gray mb-4">
        Upload locally extracted covers to Vercel Blob for cloud hosting.
        This makes covers work on Vercel deployment.
      </p>

      <button
        onClick={handleUpload}
        disabled={isUploading || !isAuthenticated}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading ? 'Uploading...' : 'Upload Covers to Cloud'}
      </button>

      {!isAuthenticated && (
        <p className="text-yellow-500 text-sm mt-2">
          Please login to upload covers.
        </p>
      )}

      {result && (
        <div className="mt-4 p-4 bg-netflix-gray rounded text-sm">
          <p className="text-white">
            Processed: {result.processed} books
          </p>
          <p className="text-green-400">
            Uploaded: {result.uploaded}
          </p>
          <p className="text-yellow-400">
            Skipped: {result.skipped}
          </p>
          {result.errors > 0 && (
            <p className="text-red-400">
              Errors: {result.errors}
            </p>
          )}
          {result.error && (
            <p className="text-red-400 mt-2">
              {result.error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
