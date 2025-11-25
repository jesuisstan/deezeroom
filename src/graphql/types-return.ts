// GraphQL Types
// TypeScript interfaces that match the GraphQL schema
// These types are used in resolvers, handlers, and throughout the application
//
// ⚠️ IMPORTANT: These types MUST match between client and server:
// - the types in deezeroom/src/graphql/types-return.ts
// - the types in deezeroom-server/src/graphql/types-return.ts
// If you change something in one of these files, update the other file accordingly to avoid type mismatches

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
