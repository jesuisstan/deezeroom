// GraphQL Schema Definition
// !!! ATTENTION: DO NOT FORGET TO UPDATE THE SCHEMA IF YOU CHANGE THE TYPE DEFINITIONS BELOW
import { INDEX_DEFAULT, LIMIT_DEFAULT } from '@/constants/deezer';

export const typeDefs = /* GraphQL */ `
  type Artist {
    id: ID!
    name: String!
    picture: String
    pictureSmall: String
    pictureMedium: String
    pictureBig: String
    pictureXl: String
    link: String
  }

  type Album {
    id: ID!
    title: String!
    cover: String
    coverSmall: String
    coverMedium: String
    coverBig: String
    coverXl: String
    link: String
    tracklist: String
  }

  type Track {
    id: ID!
    title: String!
    titleShort: String!
    duration: Int!
    preview: String
    explicitLyrics: Boolean!
    artist: Artist!
    album: Album!
  }

  type SearchTracksResult {
    tracks: [Track!]!
    total: Int!
    hasMore: Boolean!
  }

  type Query {
    searchTracks(
      query: String!
      limit: Int = ${LIMIT_DEFAULT}
      index: Int = ${INDEX_DEFAULT}
    ): SearchTracksResult!
    track(id: ID!): Track
  }
`;

// TypeScript interfaces that match the GraphQL schema
// !!! ATTENTION: DO NOT FORGET TO UPDATE THE TYPE DEFINITIONS IF YOU CHANGE THE SCHEMA ABOVE
export interface SearchTracksResult {
  tracks: Track[];
  total: number;
  hasMore: boolean;
}

export interface TrackResult {
  track: Track | null;
}

export interface Track {
  id: string;
  title: string;
  titleShort: string;
  duration: number;
  preview?: string;
  explicitLyrics: boolean;
  artist: Artist;
  album: Album;
}

export interface Artist {
  id: string;
  name: string;
  picture?: string;
  pictureSmall?: string;
  pictureMedium?: string;
  pictureBig?: string;
  pictureXl?: string;
  link?: string;
}

export interface Album {
  id: string;
  title: string;
  cover?: string;
  coverSmall?: string;
  coverMedium?: string;
  coverBig?: string;
  coverXl?: string;
  link?: string;
  tracklist?: string;
}
