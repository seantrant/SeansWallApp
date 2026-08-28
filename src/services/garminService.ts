import type { GarminData } from '../types';

// ---------------------------------------------------------------------------
// SeansAppServer /api/garmin client
// ---------------------------------------------------------------------------

export async function fetchGarminData(serverUrl: string): Promise<GarminData> {
  const url = `${serverUrl.replace(/\/+$/, '')}/api/garmin`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });

  if (!response.ok) {
    throw new Error(`Garmin endpoint returned ${response.status}`);
  }

  return (await response.json()) as GarminData;
}
