import { Logger } from '@/modules/logger';

// GraphQL API Configuration
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081/api';

// GraphQL Query Builder
class GraphQLClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async query(query: string, variables?: Record<string, any>) {
    try {
      const response = await fetch(`${this.baseUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query,
          variables: variables || {}
        })
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
      }

      return result.data;
    } catch (error) {
      Logger.error('GraphQL query failed:', error, 'GraphQLClient');
      throw error;
    }
  }
}

// Create singleton instance
const graphqlClient = new GraphQLClient();

// GraphQL Queries
export const DEEZER_QUERIES = {
  // Get track by ID
  GET_TRACK: `
    query GetTrack($id: ID!) {
      track(id: $id) {
        id
        title
        titleShort
        duration
        preview
        link
        share
        explicitLyrics
        rank
        releaseDate
        artist {
          id
          name
          picture
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
        }
        album {
          id
          title
          cover
          coverSmall
          coverMedium
          coverBig
          coverXl
          releaseDate
        }
      }
    }
  `,

  // Get artist by ID
  GET_ARTIST: `
    query GetArtist($id: ID!) {
      artist(id: $id) {
        id
        name
        picture
        pictureSmall
        pictureMedium
        pictureBig
        pictureXl
        link
        share
        radio
        tracklist
      }
    }
  `,

  // Get album by ID
  GET_ALBUM: `
    query GetAlbum($id: ID!) {
      album(id: $id) {
        id
        title
        cover
        coverSmall
        coverMedium
        coverBig
        coverXl
        releaseDate
        tracklist
      }
    }
  `,

  // Get playlist by ID
  GET_PLAYLIST: `
    query GetPlaylist($id: ID!) {
      playlist(id: $id) {
        id
        title
        description
        duration
        public
        nbTracks
        fans
        link
        share
        picture
        pictureSmall
        pictureMedium
        pictureBig
        pictureXl
        creationDate
        creator {
          id
          name
          picture
        }
      }
    }
  `,

  // Search tracks
  SEARCH_TRACKS: `
    query SearchTracks($input: SearchInput!) {
      searchTracks(input: $input) {
        data {
          id
          title
          titleShort
          duration
          preview
          link
          share
          explicitLyrics
          rank
          releaseDate
          artist {
            id
            name
            picture
            pictureSmall
            pictureMedium
            pictureBig
            pictureXl
          }
          album {
            id
            title
            cover
            coverSmall
            coverMedium
            coverBig
            coverXl
            releaseDate
          }
        }
        total
        next
        prev
      }
    }
  `,

  // Search artists
  SEARCH_ARTISTS: `
    query SearchArtists($input: SearchInput!) {
      searchArtists(input: $input) {
        data {
          id
          name
          picture
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
          link
          share
          radio
          tracklist
        }
        total
        next
        prev
      }
    }
  `,

  // Search playlists
  SEARCH_PLAYLISTS: `
    query SearchPlaylists($input: SearchInput!) {
      searchPlaylists(input: $input) {
        data {
          id
          title
          description
          duration
          public
          nbTracks
          fans
          link
          share
          picture
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
          creationDate
          creator {
            id
            name
            picture
          }
        }
        total
        next
        prev
      }
    }
  `,

  // Get artist's top tracks
  ARTIST_TOP_TRACKS: `
    query ArtistTopTracks($artistId: ID!, $limit: Int) {
      artistTopTracks(artistId: $artistId, limit: $limit) {
        id
        title
        titleShort
        duration
        preview
        link
        share
        explicitLyrics
        rank
        releaseDate
        artist {
          id
          name
          picture
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
        }
        album {
          id
          title
          cover
          coverSmall
          coverMedium
          coverBig
          coverXl
          releaseDate
        }
      }
    }
  `,

  // Get album tracks
  ALBUM_TRACKS: `
    query AlbumTracks($albumId: ID!) {
      albumTracks(albumId: $albumId) {
        id
        title
        titleShort
        duration
        preview
        link
        share
        explicitLyrics
        rank
        releaseDate
        artist {
          id
          name
          picture
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
        }
        album {
          id
          title
          cover
          coverSmall
          coverMedium
          coverBig
          coverXl
          releaseDate
        }
      }
    }
  `,

  // Get playlist tracks
  PLAYLIST_TRACKS: `
    query PlaylistTracks($playlistId: ID!) {
      playlistTracks(playlistId: $playlistId) {
        id
        title
        titleShort
        duration
        preview
        link
        share
        explicitLyrics
        rank
        releaseDate
        artist {
          id
          name
          picture
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
        }
        album {
          id
          title
          cover
          coverSmall
          coverMedium
          coverBig
          coverXl
          releaseDate
        }
      }
    }
  `
};

// Service class for Deezer API operations
export class DeezerService {
  // Get track by ID
  static async getTrack(id: string) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.GET_TRACK, { id });
      return data.track;
    } catch (error) {
      Logger.error(`Error fetching track ${id}:`, error, 'DeezerService');
      throw error;
    }
  }

  // Get artist by ID
  static async getArtist(id: string) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.GET_ARTIST, { id });
      return data.artist;
    } catch (error) {
      Logger.error(`Error fetching artist ${id}:`, error, 'DeezerService');
      throw error;
    }
  }

  // Get album by ID
  static async getAlbum(id: string) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.GET_ALBUM, { id });
      return data.album;
    } catch (error) {
      Logger.error(`Error fetching album ${id}:`, error, 'DeezerService');
      throw error;
    }
  }

  // Get playlist by ID
  static async getPlaylist(id: string) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.GET_PLAYLIST, {
        id
      });
      return data.playlist;
    } catch (error) {
      Logger.error(`Error fetching playlist ${id}:`, error, 'DeezerService');
      throw error;
    }
  }

  // Search tracks
  static async searchTracks(
    query: string,
    limit: number = 25,
    index: number = 0
  ) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.SEARCH_TRACKS, {
        input: { query, limit, index }
      });
      return data.searchTracks;
    } catch (error) {
      Logger.error(
        `Error searching tracks for "${query}":`,
        error,
        'DeezerService'
      );
      throw error;
    }
  }

  // Search artists
  static async searchArtists(
    query: string,
    limit: number = 25,
    index: number = 0
  ) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.SEARCH_ARTISTS, {
        input: { query, limit, index }
      });
      return data.searchArtists;
    } catch (error) {
      Logger.error(
        `Error searching artists for "${query}":`,
        error,
        'DeezerService'
      );
      throw error;
    }
  }

  // Search playlists
  static async searchPlaylists(
    query: string,
    limit: number = 25,
    index: number = 0
  ) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.SEARCH_PLAYLISTS, {
        input: { query, limit, index }
      });
      return data.searchPlaylists;
    } catch (error) {
      Logger.error(
        `Error searching playlists for "${query}":`,
        error,
        'DeezerService'
      );
      throw error;
    }
  }

  // Get artist's top tracks
  static async getArtistTopTracks(artistId: string, limit: number = 50) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.ARTIST_TOP_TRACKS, {
        artistId,
        limit
      });
      return data.artistTopTracks;
    } catch (error) {
      Logger.error(
        `Error fetching top tracks for artist ${artistId}:`,
        error,
        'DeezerService'
      );
      throw error;
    }
  }

  // Get album tracks
  static async getAlbumTracks(albumId: string) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.ALBUM_TRACKS, {
        albumId
      });
      return data.albumTracks;
    } catch (error) {
      Logger.error(
        `Error fetching tracks for album ${albumId}:`,
        error,
        'DeezerService'
      );
      throw error;
    }
  }

  // Get playlist tracks
  static async getPlaylistTracks(playlistId: string) {
    try {
      const data = await graphqlClient.query(DEEZER_QUERIES.PLAYLIST_TRACKS, {
        playlistId
      });
      return data.playlistTracks;
    } catch (error) {
      Logger.error(
        `Error fetching tracks for playlist ${playlistId}:`,
        error,
        'DeezerService'
      );
      throw error;
    }
  }
}

// Type definitions for TypeScript
export interface DeezerTrack {
  id: string;
  title: string;
  titleShort: string;
  duration: number;
  preview?: string;
  link: string;
  share: string;
  explicitLyrics: boolean;
  rank: number;
  releaseDate: string;
  artist: DeezerArtist;
  album: DeezerAlbum;
}

export interface DeezerArtist {
  id: string;
  name: string;
  picture?: string;
  pictureSmall?: string;
  pictureMedium?: string;
  pictureBig?: string;
  pictureXl?: string;
  link: string;
  share: string;
  radio: boolean;
  tracklist: string;
}

export interface DeezerAlbum {
  id: string;
  title: string;
  cover?: string;
  coverSmall?: string;
  coverMedium?: string;
  coverBig?: string;
  coverXl?: string;
  releaseDate: string;
  tracklist: string;
}

export interface DeezerPlaylist {
  id: string;
  title: string;
  description?: string;
  duration: number;
  public: boolean;
  nbTracks: number;
  fans: number;
  link: string;
  share: string;
  picture?: string;
  pictureSmall?: string;
  pictureMedium?: string;
  pictureBig?: string;
  pictureXl?: string;
  creationDate: string;
  creator: DeezerArtist;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  next?: string;
  prev?: string;
}

export default DeezerService;
