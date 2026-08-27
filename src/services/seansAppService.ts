import type { PersonalRecord, ServerSnapshot } from '../types';

// ---------------------------------------------------------------------------
// SeansAppServer API client
// ---------------------------------------------------------------------------

export async function fetchSnapshot(
  serverUrl: string,
): Promise<ServerSnapshot> {
  // Keep the path clean: the deployed server routes on the exact path
  // (GET /api/snapshot). Adding a query string would 404 against it, so we
  // use no-cache headers instead of a cache-busting query param.
  const url = `${serverUrl.replace(/\/+$/, '')}/api/snapshot`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  return (await response.json()) as ServerSnapshot;
}

export async function fetchServerHealth(
  serverUrl: string,
): Promise<{ status: string; snapshotPresent: boolean }> {
  const url = `${serverUrl.replace(/\/+$/, '')}/health`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check returned ${response.status}`);
  }

  return await response.json();
}

/** Records plus the server-side snapshot timestamps they came from. */
export interface RecordsResult {
  records: PersonalRecord[];
  /** When the snapshot was last saved on the server. */
  savedAt: string | null;
  /** When the snapshot was exported from the phone. */
  exportedAt: string | null;
}

/**
 * Fetch only the records array from the server snapshot.
 * Filters out soft-deleted records.
 */
export async function fetchRecords(
  serverUrl: string,
): Promise<RecordsResult> {
  const snapshot = await fetchSnapshot(serverUrl);
  return {
    records: (snapshot.records ?? []).filter((r) => !r.deletedAt),
    savedAt: snapshot.savedAt ?? null,
    exportedAt: snapshot.exportedAt ?? null,
  };
}
