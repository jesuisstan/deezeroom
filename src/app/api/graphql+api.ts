import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLID,
  GraphQLInputObjectType,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString
} from 'graphql';
import { createHandler } from 'graphql-http/lib/use/fetch';

import { Logger } from '@/modules/logger';

// Deezer API Base URL
const DEEZER_API_BASE = 'https://api.deezer.com';

// Helper function to fetch from Deezer API
async function fetchFromDeezer(endpoint: string) {
  try {
    const response = await fetch(`${DEEZER_API_BASE}${endpoint}`);
    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching from Deezer API:', error);
    Logger.error('Error fetching from Deezer API:', error, '📝 graphql+api');
    throw error;
  }
}

// GraphQL Types
const ArtistType = new GraphQLObjectType({
  name: 'Artist',
  fields: {
    id: { type: GraphQLID },
    name: { type: GraphQLString },
    link: { type: GraphQLString },
    share: { type: GraphQLString },
    picture: { type: GraphQLString },
    pictureSmall: { type: GraphQLString },
    pictureMedium: { type: GraphQLString },
    pictureBig: { type: GraphQLString },
    pictureXl: { type: GraphQLString },
    radio: { type: GraphQLBoolean },
    tracklist: { type: GraphQLString },
    type: { type: GraphQLString }
  }
});

const AlbumType = new GraphQLObjectType({
  name: 'Album',
  fields: {
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    link: { type: GraphQLString },
    cover: { type: GraphQLString },
    coverSmall: { type: GraphQLString },
    coverMedium: { type: GraphQLString },
    coverBig: { type: GraphQLString },
    coverXl: { type: GraphQLString },
    md5Image: { type: GraphQLString },
    releaseDate: { type: GraphQLString },
    tracklist: { type: GraphQLString },
    type: { type: GraphQLString }
  }
});

const TrackType = new GraphQLObjectType({
  name: 'Track',
  fields: {
    id: { type: GraphQLID },
    readable: { type: GraphQLBoolean },
    title: { type: GraphQLString },
    titleShort: { type: GraphQLString },
    titleVersion: { type: GraphQLString },
    isrc: { type: GraphQLString },
    link: { type: GraphQLString },
    share: { type: GraphQLString },
    duration: { type: GraphQLInt },
    trackPosition: { type: GraphQLInt },
    diskNumber: { type: GraphQLInt },
    rank: { type: GraphQLInt },
    releaseDate: { type: GraphQLString },
    explicitLyrics: { type: GraphQLBoolean },
    explicitContentLyrics: { type: GraphQLInt },
    explicitContentCover: { type: GraphQLInt },
    preview: { type: GraphQLString },
    bpm: { type: GraphQLFloat },
    gain: { type: GraphQLFloat },
    availableCountries: { type: new GraphQLList(GraphQLString) },
    contributors: { type: new GraphQLList(ArtistType) },
    md5Image: { type: GraphQLString },
    trackToken: { type: GraphQLString },
    artist: { type: ArtistType },
    album: { type: AlbumType },
    type: { type: GraphQLString }
  }
});

const PlaylistType = new GraphQLObjectType({
  name: 'Playlist',
  fields: {
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    duration: { type: GraphQLInt },
    public: { type: GraphQLBoolean },
    isLovedTrack: { type: GraphQLBoolean },
    collaborative: { type: GraphQLBoolean },
    nbTracks: { type: GraphQLInt },
    fans: { type: GraphQLInt },
    link: { type: GraphQLString },
    share: { type: GraphQLString },
    picture: { type: GraphQLString },
    pictureSmall: { type: GraphQLString },
    pictureMedium: { type: GraphQLString },
    pictureBig: { type: GraphQLString },
    pictureXl: { type: GraphQLString },
    checksum: { type: GraphQLString },
    tracklist: { type: GraphQLString },
    creationDate: { type: GraphQLString },
    md5Image: { type: GraphQLString },
    pictureType: { type: GraphQLString },
    creator: { type: ArtistType },
    type: { type: GraphQLString }
  }
});

const SearchResultType = new GraphQLObjectType({
  name: 'SearchResult',
  fields: {
    data: { type: new GraphQLList(TrackType) },
    total: { type: GraphQLInt },
    next: { type: GraphQLString },
    prev: { type: GraphQLString }
  }
});

// Input Types
const SearchInputType = new GraphQLInputObjectType({
  name: 'SearchInput',
  fields: {
    query: { type: new GraphQLNonNull(GraphQLString) },
    limit: { type: GraphQLInt },
    index: { type: GraphQLInt }
  }
});

// Root Query Type
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    // Get track by ID
    track: {
      type: TrackType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, { id }) => {
        return await fetchFromDeezer(`/track/${id}`);
      }
    },

    // Get artist by ID
    artist: {
      type: ArtistType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, { id }) => {
        return await fetchFromDeezer(`/artist/${id}`);
      }
    },

    // Get album by ID
    album: {
      type: AlbumType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, { id }) => {
        return await fetchFromDeezer(`/album/${id}`);
      }
    },

    // Get playlist by ID
    playlist: {
      type: PlaylistType,
      args: {
        id: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, { id }) => {
        return await fetchFromDeezer(`/playlist/${id}`);
      }
    },

    // Search tracks
    searchTracks: {
      type: SearchResultType,
      args: {
        input: { type: new GraphQLNonNull(SearchInputType) }
      },
      resolve: async (_, { input }) => {
        const { query, limit = 25, index = 0 } = input;
        const params = new URLSearchParams({
          q: query,
          limit: limit.toString(),
          index: index.toString()
        });
        return await fetchFromDeezer(`/search/track?${params}`);
      }
    },

    // Search artists
    searchArtists: {
      type: new GraphQLObjectType({
        name: 'ArtistSearchResult',
        fields: {
          data: { type: new GraphQLList(ArtistType) },
          total: { type: GraphQLInt },
          next: { type: GraphQLString },
          prev: { type: GraphQLString }
        }
      }),
      args: {
        input: { type: new GraphQLNonNull(SearchInputType) }
      },
      resolve: async (_, { input }) => {
        const { query, limit = 25, index = 0 } = input;
        const params = new URLSearchParams({
          q: query,
          limit: limit.toString(),
          index: index.toString()
        });
        return await fetchFromDeezer(`/search/artist?${params}`);
      }
    },

    // Search playlists
    searchPlaylists: {
      type: new GraphQLObjectType({
        name: 'PlaylistSearchResult',
        fields: {
          data: { type: new GraphQLList(PlaylistType) },
          total: { type: GraphQLInt },
          next: { type: GraphQLString },
          prev: { type: GraphQLString }
        }
      }),
      args: {
        input: { type: new GraphQLNonNull(SearchInputType) }
      },
      resolve: async (_, { input }) => {
        const { query, limit = 25, index = 0 } = input;
        const params = new URLSearchParams({
          q: query,
          limit: limit.toString(),
          index: index.toString()
        });
        return await fetchFromDeezer(`/search/playlist?${params}`);
      }
    },

    // Get artist's top tracks
    artistTopTracks: {
      type: new GraphQLList(TrackType),
      args: {
        artistId: { type: new GraphQLNonNull(GraphQLID) },
        limit: { type: GraphQLInt }
      },
      resolve: async (_, { artistId, limit = 50 }) => {
        const params = new URLSearchParams({
          limit: limit.toString()
        });
        const result = await fetchFromDeezer(
          `/artist/${artistId}/top?${params}`
        );
        return result.data || [];
      }
    },

    // Get album tracks
    albumTracks: {
      type: new GraphQLList(TrackType),
      args: {
        albumId: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, { albumId }) => {
        const result = await fetchFromDeezer(`/album/${albumId}/tracks`);
        return result.data || [];
      }
    },

    // Get playlist tracks
    playlistTracks: {
      type: new GraphQLList(TrackType),
      args: {
        playlistId: { type: new GraphQLNonNull(GraphQLID) }
      },
      resolve: async (_, { playlistId }) => {
        const result = await fetchFromDeezer(`/playlist/${playlistId}/tracks`);
        return result.data || [];
      }
    }
  }
});

// Create GraphQL Schema
const schema = new GraphQLSchema({
  query: QueryType
});

// Create handler
const handler = createHandler({ schema });

export function POST(req: Request) {
  return handler(req);
}

export function GET(req: Request) {
  return handler(req);
}
