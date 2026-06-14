export type RadioMetadataType = "somafm" | "radioparadise" | "none";

export interface RadioStation {
  id: string;
  name: string;
  streamUrl: string;
  metadataType: RadioMetadataType;
  somaChannel?: string;
  rpGenre?: string;
}

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: "groove-salad",
    name: "SomaFM Groove Salad",
    streamUrl: "https://ice5.somafm.com/groovesalad-128-mp3",
    metadataType: "somafm",
    somaChannel: "groovesalad",
  },
  {
    id: "drone-zone",
    name: "SomaFM Drone Zone",
    streamUrl: "https://ice5.somafm.com/dronezone-128-mp3",
    metadataType: "somafm",
    somaChannel: "dronezone",
  },
  {
    id: "deep-space",
    name: "SomaFM Deep Space One",
    streamUrl: "https://ice5.somafm.com/deepspaceone-128-mp3",
    metadataType: "somafm",
    somaChannel: "deepspaceone",
  },
  {
    id: "rp-mellow",
    name: "Radio Paradise Mellow Mix",
    streamUrl: "https://stream.radioparadise.com/mellow-128",
    metadataType: "radioparadise",
    rpGenre: "mellow",
  },
];

/** Restore last station (and resume if was playing) on load */
export const RADIO_AUTO_RESTORE = true;

export const RADIO_STORAGE_KEY = "jarvis-radio-station";
export const RADIO_PLAYING_KEY = "jarvis-radio-playing";

export function getStationById(id: string): RadioStation | undefined {
  return RADIO_STATIONS.find((s) => s.id === id);
}
