// File scanner for detecting audiobook candidates
// SERVER ONLY - uses Node.js fs and music-metadata

import 'server-only';
import fs from 'fs';
import path from 'path';
import * as mm from 'music-metadata';
import { ScannedBookCandidate, AUDIO_EXTENSIONS, AUDIOBOOK_EXTENSIONS } from './types';

// Generate a simple hash for temporary IDs
function generateId(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check if a file is an audio file
function isAudioFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return AUDIO_EXTENSIONS.includes(ext);
}

// Check if a file is an audiobook file (m4b)
function isAudiobookFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return AUDIOBOOK_EXTENSIONS.includes(ext);
}

// Parse series info from folder/file name
// Patterns: "Series Name - Book 1", "Series Name 01", "[Author] Series - 01 - Title"
function parseSeriesFromName(name: string): { series: string | null; bookNumber: string | null; cleanTitle: string } {
  // Pattern: "Series Name - Book 1 - Title" or "Series - 01 - Title"
  const dashPattern = /^(.+?)\s*[-–]\s*(?:Book\s*)?(\d+(?:\.\d+)?)\s*[-–]\s*(.+)$/i;
  const dashMatch = name.match(dashPattern);
  if (dashMatch) {
    return {
      series: dashMatch[1].trim(),
      bookNumber: dashMatch[2],
      cleanTitle: dashMatch[3].trim(),
    };
  }

  // Pattern: "Series Name - Book 1" (no separate title)
  const simplePattern = /^(.+?)\s*[-–]\s*(?:Book\s*)?(\d+(?:\.\d+)?)$/i;
  const simpleMatch = name.match(simplePattern);
  if (simpleMatch) {
    return {
      series: simpleMatch[1].trim(),
      bookNumber: simpleMatch[2],
      cleanTitle: name,
    };
  }

  // Pattern: "[Author] Series - Title"
  const bracketPattern = /^\[.+?\]\s*(.+?)\s*[-–]\s*(.+)$/;
  const bracketMatch = name.match(bracketPattern);
  if (bracketMatch) {
    return {
      series: bracketMatch[1].trim(),
      bookNumber: null,
      cleanTitle: bracketMatch[2].trim(),
    };
  }

  return { series: null, bookNumber: null, cleanTitle: name };
}

// Extract metadata from a single audio file
async function extractFileMetadata(filePath: string): Promise<{
  title: string | null;
  author: string | null;
  narrator: string | null;
  durationSeconds: number | null;
  hasEmbeddedCover: boolean;
}> {
  try {
    const metadata = await mm.parseFile(filePath, { duration: true });
    const common = metadata.common;

    // Narrator might be in 'composer' field or custom tags
    let narrator = common.composer?.join(', ') || null;
    if (!narrator && common.comment) {
      // Sometimes narrator is in comments - handle various comment formats
      const rawComments = common.comment;
      const commentStrings: string[] = [];

      if (Array.isArray(rawComments)) {
        for (const c of rawComments) {
          if (typeof c === 'string') {
            commentStrings.push(c);
          } else if (c && typeof c === 'object' && 'text' in c && typeof c.text === 'string') {
            commentStrings.push(c.text);
          }
        }
      } else if (typeof rawComments === 'string') {
        commentStrings.push(rawComments);
      }

      for (const comment of commentStrings) {
        if (comment.toLowerCase().includes('narrat')) {
          narrator = comment.replace(/narrat(ed|or)\s*(by)?:?\s*/i, '').trim();
          break;
        }
      }
    }

    return {
      title: common.title || null,
      author: common.artist || common.albumartist || null,
      narrator,
      durationSeconds: metadata.format.duration ? Math.round(metadata.format.duration) : null,
      hasEmbeddedCover: (common.picture && common.picture.length > 0) || false,
    };
  } catch (error) {
    console.error(`[Scanner] Error extracting metadata from ${filePath}:`, error);
    return {
      title: null,
      author: null,
      narrator: null,
      durationSeconds: null,
      hasEmbeddedCover: false,
    };
  }
}

// Scan a folder for audio files and return stats
async function scanFolderContents(folderPath: string): Promise<{
  audioFiles: { path: string; size: number; isM4b: boolean }[];
  totalSize: number;
  m4bFiles: string[];
}> {
  const audioFiles: { path: string; size: number; isM4b: boolean }[] = [];
  let totalSize = 0;
  const m4bFiles: string[] = [];

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && isAudioFile(entry.name)) {
        const filePath = path.join(folderPath, entry.name);
        const stats = fs.statSync(filePath);
        const isM4b = isAudiobookFile(entry.name);

        audioFiles.push({ path: filePath, size: stats.size, isM4b });
        totalSize += stats.size;

        if (isM4b) {
          m4bFiles.push(filePath);
        }
      }
    }
  } catch (error) {
    console.error(`[Scanner] Error scanning folder ${folderPath}:`, error);
  }

  return { audioFiles, totalSize, m4bFiles };
}

// Process a folder as a book candidate
async function processFolderAsBook(folderPath: string): Promise<ScannedBookCandidate | ScannedBookCandidate[] | null> {
  const folderName = path.basename(folderPath);
  const { audioFiles, totalSize, m4bFiles } = await scanFolderContents(folderPath);

  if (audioFiles.length === 0) {
    return null; // No audio files, skip
  }

  const warnings: string[] = [];
  const errors: string[] = [];

  // Handle multiple .m4b files case
  if (m4bFiles.length > 1) {
    // Return a single candidate with a flag requiring user decision
    const { series, bookNumber, cleanTitle } = parseSeriesFromName(folderName);

    // Get metadata from the first m4b for initial display
    const firstMeta = await extractFileMetadata(m4bFiles[0]);

    // Calculate total duration of all m4b files
    let totalDuration = 0;
    for (const m4bPath of m4bFiles) {
      const meta = await extractFileMetadata(m4bPath);
      if (meta.durationSeconds) {
        totalDuration += meta.durationSeconds;
      }
    }

    warnings.push(`Multiple .m4b files (${m4bFiles.length}): user decision required`);

    return {
      id: generateId(folderPath),
      path: folderPath,
      type: 'Folder',
      title: firstMeta.title || cleanTitle || folderName,
      author: firstMeta.author,
      narrator: firstMeta.narrator,
      series: series,
      seriesBookNumber: bookNumber,
      durationSeconds: totalDuration || null,
      totalSizeBytes: totalSize,
      fileCount: audioFiles.length,
      hasEmbeddedCover: firstMeta.hasEmbeddedCover,
      multipleM4bFiles: true,
      m4bFileCount: m4bFiles.length,
      m4bFilePaths: m4bFiles,
      userDecision: null,
      warnings,
      errors,
      selected: true,
    };
  }

  // Single .m4b file case - use it as canonical source
  if (m4bFiles.length === 1) {
    const meta = await extractFileMetadata(m4bFiles[0]);
    const { series, bookNumber, cleanTitle } = parseSeriesFromName(folderName);

    return {
      id: generateId(folderPath),
      path: folderPath,
      type: 'Folder',
      title: meta.title || cleanTitle || folderName,
      author: meta.author,
      narrator: meta.narrator,
      series: series,
      seriesBookNumber: bookNumber,
      durationSeconds: meta.durationSeconds,
      totalSizeBytes: totalSize,
      fileCount: audioFiles.length,
      hasEmbeddedCover: meta.hasEmbeddedCover,
      warnings,
      errors,
      selected: true,
    };
  }

  // No .m4b files - sum duration of all audio files
  let totalDuration = 0;
  let representativeFile = audioFiles[0];
  let representativeMeta = await extractFileMetadata(representativeFile.path);

  // Find the largest file as representative and sum durations
  for (const file of audioFiles) {
    const meta = await extractFileMetadata(file.path);
    if (meta.durationSeconds) {
      totalDuration += meta.durationSeconds;
    }
    if (file.size > representativeFile.size) {
      representativeFile = file;
      representativeMeta = meta;
    }
  }

  const { series, bookNumber, cleanTitle } = parseSeriesFromName(folderName);

  return {
    id: generateId(folderPath),
    path: folderPath,
    type: 'Folder',
    title: representativeMeta.title || cleanTitle || folderName,
    author: representativeMeta.author,
    narrator: representativeMeta.narrator,
    series: series,
    seriesBookNumber: bookNumber,
    durationSeconds: totalDuration || null,
    totalSizeBytes: totalSize,
    fileCount: audioFiles.length,
    hasEmbeddedCover: representativeMeta.hasEmbeddedCover,
    warnings,
    errors,
    selected: true,
  };
}

// Process a single audio file as a book candidate
async function processSingleFileAsBook(filePath: string): Promise<ScannedBookCandidate> {
  const fileName = path.basename(filePath, path.extname(filePath));
  const stats = fs.statSync(filePath);
  const meta = await extractFileMetadata(filePath);
  const warnings: string[] = [];
  const errors: string[] = [];

  // Warn for suspicious cases
  if (meta.durationSeconds && meta.durationSeconds < 600) {
    warnings.push('Very short duration (<10 min)');
  }
  if (stats.size < 5 * 1024 * 1024) {
    warnings.push('Small file (<5 MB)');
  }

  const { series, bookNumber, cleanTitle } = parseSeriesFromName(fileName);

  return {
    id: generateId(filePath),
    path: filePath,
    type: 'SingleFile',
    title: meta.title || cleanTitle || fileName,
    author: meta.author,
    narrator: meta.narrator,
    series: series,
    seriesBookNumber: bookNumber,
    durationSeconds: meta.durationSeconds,
    totalSizeBytes: stats.size,
    fileCount: 1,
    hasEmbeddedCover: meta.hasEmbeddedCover,
    warnings,
    errors,
    selected: true,
  };
}

// Check if a folder contains subfolders (to determine if it's a book folder or a container)
function hasSubfolders(folderPath: string): boolean {
  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    return entries.some(e => e.isDirectory());
  } catch {
    return false;
  }
}

// Main scan function
export interface ScanOptions {
  recursive?: boolean;
  maxDepth?: number;
}

export async function scanFolder(
  rootPath: string,
  options: ScanOptions = {}
): Promise<{ candidates: ScannedBookCandidate[]; scannedFolders: number; warnings: string[] }> {
  const { recursive = true, maxDepth = 5 } = options;
  const candidates: ScannedBookCandidate[] = [];
  const warnings: string[] = [];
  let scannedFolders = 0;

  // Validate root path
  if (!fs.existsSync(rootPath)) {
    throw new Error(`Path does not exist: ${rootPath}`);
  }

  const rootStats = fs.statSync(rootPath);
  if (!rootStats.isDirectory()) {
    throw new Error(`Path is not a directory: ${rootPath}`);
  }

  // Recursive folder walker
  async function walkFolder(folderPath: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      warnings.push(`Max depth reached at: ${folderPath}`);
      return;
    }

    scannedFolders++;

    try {
      const entries = fs.readdirSync(folderPath, { withFileTypes: true });
      const subfolders = entries.filter(e => e.isDirectory());
      const files = entries.filter(e => e.isFile());

      // Check for standalone audiobook files at this level
      const standaloneAudiobooks = files.filter(f => isAudiobookFile(f.name));
      const audioFiles = files.filter(f => isAudioFile(f.name));

      // If this folder has subfolders, recurse into them
      if (subfolders.length > 0 && recursive) {
        for (const subfolder of subfolders) {
          await walkFolder(path.join(folderPath, subfolder.name), depth + 1);
        }

        // Also check for standalone audiobook files at this level
        for (const file of standaloneAudiobooks) {
          const filePath = path.join(folderPath, file.name);
          const candidate = await processSingleFileAsBook(filePath);
          candidates.push(candidate);
        }
      } else if (audioFiles.length > 0) {
        // This is a leaf folder with audio files - treat as a book
        const result = await processFolderAsBook(folderPath);
        if (result) {
          if (Array.isArray(result)) {
            candidates.push(...result);
          } else {
            candidates.push(result);
          }
        }
      } else if (standaloneAudiobooks.length > 0) {
        // Only standalone audiobook files
        for (const file of standaloneAudiobooks) {
          const filePath = path.join(folderPath, file.name);
          const candidate = await processSingleFileAsBook(filePath);
          candidates.push(candidate);
        }
      }
    } catch (error) {
      console.error(`[Scanner] Error walking folder ${folderPath}:`, error);
      warnings.push(`Error scanning: ${folderPath}`);
    }
  }

  await walkFolder(rootPath, 0);

  return { candidates, scannedFolders, warnings };
}

// Split a multi-.m4b candidate into multiple individual candidates
export async function splitMultiM4bCandidate(
  candidate: ScannedBookCandidate
): Promise<ScannedBookCandidate[]> {
  if (!candidate.m4bFilePaths || candidate.m4bFilePaths.length === 0) {
    return [candidate];
  }

  const results: ScannedBookCandidate[] = [];

  for (const m4bPath of candidate.m4bFilePaths) {
    const meta = await extractFileMetadata(m4bPath);
    const fileName = path.basename(m4bPath, path.extname(m4bPath));
    const stats = fs.statSync(m4bPath);
    const { series, bookNumber, cleanTitle } = parseSeriesFromName(fileName);

    results.push({
      id: generateId(m4bPath),
      path: m4bPath,
      type: 'SingleFile',
      title: meta.title || cleanTitle || fileName,
      author: meta.author || candidate.author,
      narrator: meta.narrator || candidate.narrator,
      series: series || candidate.series,
      seriesBookNumber: bookNumber || candidate.seriesBookNumber,
      durationSeconds: meta.durationSeconds,
      totalSizeBytes: stats.size,
      fileCount: 1,
      hasEmbeddedCover: meta.hasEmbeddedCover,
      warnings: [],
      errors: [],
      selected: true,
    });
  }

  return results;
}

// Merge multiple .m4b files info into a single book candidate
export function mergeMultiM4bCandidate(candidate: ScannedBookCandidate): ScannedBookCandidate {
  // The candidate already has aggregated info, just clear the decision requirement
  return {
    ...candidate,
    multipleM4bFiles: false, // Clear the flag since user decided
    userDecision: 'single',
    warnings: candidate.warnings.filter(w => !w.includes('user decision required')),
  };
}
