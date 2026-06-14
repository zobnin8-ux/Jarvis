export interface RadioMetadata {
  track: string | null;
  artist?: string;
  title?: string;
}

export async function fetchRadioMetadata(stationId: string): Promise<RadioMetadata> {
  const response = await fetch(`/api/radio/metadata?station=${stationId}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    return { track: null };
  }

  return response.json();
}
