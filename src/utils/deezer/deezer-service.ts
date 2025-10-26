import { LIMIT_DEFAULT } from '@/constants/deezer';
import { SEARCH_ARTISTS } from '@/graphql/queries';
import { Artist, Track } from '@/graphql/schema';
import {
  DeezerArtist,
  DeezerArtistSearchResponse,
  DeezerSearchResponse,
  DeezerTrack
} from '@/utils/deezer/deezer-types';

const DEEZER_API_BASE_URL = 'https://api.deezer.com';

export class DeezerService {
  private static instance: DeezerService;

  private constructor() {}

  public static getInstance(): DeezerService {
    if (!DeezerService.instance) {
      DeezerService.instance = new DeezerService();
    }
    return DeezerService.instance;
  }

  /**
   * Search for artists using Deezer API (server-side)
   */
  async searchArtists(
    query: string,
    limit: number = LIMIT_DEFAULT,
    index: number = 0
  ): Promise<{ artists: Artist[]; total: number; hasMore: boolean }> {
    try {
      if (!query.trim()) {
        throw new Error('Search query cannot be empty');
      }

      const encodedQuery = encodeURIComponent(query.trim());
      const url = `${DEEZER_API_BASE_URL}/search/artist?q=${encodedQuery}&limit=${limit}&index=${index}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Deezer API error: ${response.status} ${response.statusText}`
        );
      }

      const data: DeezerArtistSearchResponse = await response.json();
      const artists: Artist[] = data.data.map(this.transformDeezerArtist);

      return {
        artists,
        total: data.total,
        hasMore: !!data.next
      };
    } catch (error) {
      throw new Error(
        `Failed to search artists: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Client-side helper to query our GraphQL route for artists search
   * This avoids direct calls to Deezer API from the app screens.
   */
  async searchArtistsViaGraphQL(
    query: string,
    limit: number = LIMIT_DEFAULT,
    index: number = 0
  ): Promise<{ artists: Artist[]; total: number; hasMore: boolean }> {
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: SEARCH_ARTISTS,
        variables: { query, limit, index }
      })
    });

    if (!res.ok) {
      throw new Error(`GraphQL request failed: ${res.status}`);
    }

    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(json.errors[0]?.message || 'GraphQL error');
    }

    const payload = json.data.searchArtists as {
      artists: Artist[];
      total: number;
      hasMore: boolean;
    };
    return payload;
  }

  // Get popular tracks from Deezer charts
  async getPopularTracks(
    limit: number = LIMIT_DEFAULT,
    index: number = 0
  ): Promise<{ tracks: Track[]; total: number; hasMore: boolean }> {
    try {
      const url = `${DEEZER_API_BASE_URL}/chart/0/tracks?limit=${limit}&index=${index}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DeezerSearchResponse = await response.json();
      const tracks = data.data.map(this.transformDeezerTrack);

      // For chart API, hasMore is true only if tracks were returned
      // When API returns empty data[], there are no more results
      const hasMore = tracks.length > 0;
      return {
        tracks,
        total: data.total || tracks.length,
        hasMore
      };
    } catch (error) {
      console.error('Error fetching popular tracks:', error);
      throw error;
    }
  }

  async searchTracks(
    query: string,
    limit: number = LIMIT_DEFAULT,
    index: number = 0
  ): Promise<{ tracks: Track[]; total: number; hasMore: boolean }> {
    try {
      if (!query.trim()) {
        throw new Error('Search query cannot be empty');
      }

      const encodedQuery = encodeURIComponent(query.trim());
      const url = `${DEEZER_API_BASE_URL}/search/track?q=${encodedQuery}&limit=${limit}&index=${index}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Deezer API error: ${response.status} ${response.statusText}`
        );
      }

      const data: DeezerSearchResponse = await response.json();
      const tracks = data.data.map(this.transformDeezerTrack);

      return {
        tracks,
        total: data.total,
        hasMore: !!data.next
      };
    } catch (error) {
      throw new Error(
        `Failed to search tracks: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Transform Deezer artist data to our GraphQL Artist type
   */
  private transformDeezerArtist(artist: DeezerArtist): Artist {
    return {
      id: artist.id,
      name: artist.name,
      picture: artist.picture || undefined,
      pictureSmall: artist.picture_small || undefined,
      pictureMedium: artist.picture_medium || undefined,
      pictureBig: artist.picture_big || undefined,
      pictureXl: artist.picture_xl || undefined,
      link: artist.link
    };
  }

  /**
   * Transform Deezer track data to our GraphQL Track type
   */
  private transformDeezerTrack(deezerTrack: DeezerTrack): Track {
    return {
      id: deezerTrack.id,
      title: deezerTrack.title,
      titleShort: deezerTrack.title_short,
      duration: parseInt(deezerTrack.duration, 10),
      preview: deezerTrack.preview,
      explicitLyrics: deezerTrack.explicit_lyrics,
      artist: {
        id: deezerTrack.artist.id,
        name: deezerTrack.artist.name,
        picture: deezerTrack.artist.picture || undefined,
        pictureSmall: deezerTrack.artist.picture_small || undefined,
        pictureMedium: deezerTrack.artist.picture_medium || undefined,
        pictureBig: deezerTrack.artist.picture_big || undefined,
        pictureXl: deezerTrack.artist.picture_xl || undefined,
        link: deezerTrack.artist.link
      },
      album: {
        id: deezerTrack.album.id,
        title: deezerTrack.album.title,
        cover: deezerTrack.album.cover || undefined,
        coverSmall: deezerTrack.album.cover_small || undefined,
        coverMedium: deezerTrack.album.cover_medium || undefined,
        coverBig: deezerTrack.album.cover_big || undefined,
        coverXl: deezerTrack.album.cover_xl || undefined,
        link: deezerTrack.album.link || undefined,
        tracklist: deezerTrack.album.tracklist || undefined
      }
    };
  }

  /**
   * Get track by ID from Deezer API
   * @param trackId Deezer track ID
   * @returns Promise with track data
   */
  async getTrackById(trackId: string): Promise<Track> {
    try {
      const url = `${DEEZER_API_BASE_URL}/track/${trackId}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Deezer API error: ${response.status} ${response.statusText}`
        );
      }

      const deezerTrack: DeezerTrack = await response.json();
      return this.transformDeezerTrack(deezerTrack);
    } catch (error) {
      throw new Error(
        `Failed to get track: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

// Export singleton instance
export const deezerService = DeezerService.getInstance();
