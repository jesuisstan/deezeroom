import { LIMIT_DEFAULT } from '@/constants/deezer';
import { Track } from '@/graphql/schema';
import { DeezerSearchResponse, DeezerTrack } from '@/utils/deezer/deezer-types';

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
   * Search for tracks using Deezer API
   * @param query Search query string
   * @param limit Maximum number of results
   * @param index Starting index for pagination (default: 0)
   * @returns Promise with search results
   */
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
        picture: deezerTrack.artist.picture_medium || undefined,
        link: deezerTrack.artist.link
      },
      album: {
        id: deezerTrack.album.id,
        title: deezerTrack.album.title,
        cover: deezerTrack.album.cover_medium || undefined,
        link: deezerTrack.album.link
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
