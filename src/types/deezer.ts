// Deezer API Types
export interface DeezerArtist {
  id: string;
  name: string;
  link?: string;
  share?: string;
  picture?: string;
  picture_small?: string;
  picture_medium?: string;
  picture_big?: string;
  picture_xl?: string;
  radio?: boolean;
  tracklist?: string;
  type?: string;
  role?: string;
}

export interface DeezerAlbum {
  id: string;
  title: string;
  link?: string;
  cover?: string;
  cover_small?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  md5_image?: string;
  release_date?: string;
  tracklist?: string;
  type?: string;
}

export interface DeezerTrack {
  id: string;
  readable: boolean;
  title: string;
  title_short: string;
  title_version?: string;
  isrc?: string;
  link?: string;
  share?: string;
  duration: string;
  track_position?: number;
  disk_number?: number;
  rank: string;
  release_date?: string;
  explicit_lyrics: boolean;
  explicit_content_lyrics: number;
  explicit_content_cover: number;
  preview?: string;
  bpm?: number;
  gain?: number;
  available_countries?: string[];
  contributors?: DeezerArtist[];
  md5_image?: string;
  track_token?: string;
  artist: DeezerArtist;
  album: DeezerAlbum;
  type: string;
}

export interface DeezerSearchResponse {
  data: DeezerTrack[];
  total: number;
  next?: string;
  prev?: string;
}

// GraphQL Types
export interface Track {
  id: string;
  title: string;
  titleShort: string;
  duration: number;
  preview?: string;
  artist: Artist;
  album: Album;
  explicitLyrics: boolean;
}

export interface Artist {
  id: string;
  name: string;
  picture?: string;
  link?: string;
}

export interface Album {
  id: string;
  title: string;
  cover?: string;
  link?: string;
}

export interface SearchTracksInput {
  query: string;
  limit?: number;
  index?: number;
}
