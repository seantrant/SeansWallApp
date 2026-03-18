import type { PersonalRecord, ServerSnapshot } from '../types';

// ---------------------------------------------------------------------------
// SeansAppServer API client
// ---------------------------------------------------------------------------

export async function fetchSnapshot(
  serverUrl: string,
): Promise<ServerSnapshot> {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/snapshot`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
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
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Health check returned ${response.status}`);
  }

  return await response.json();
}

/**
 * Fetch only the records array from the server snapshot.
 * Filters out soft-deleted records.
 */
export async function fetchRecords(
  serverUrl: string,
): Promise<PersonalRecord[]> {
  const snapshot = await fetchSnapshot(serverUrl);
  return (snapshot.records ?? []).filter((r) => !r.deletedAt);
}
