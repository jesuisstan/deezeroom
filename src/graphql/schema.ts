// GraphQL Schema Definition
export const typeDefs = /* GraphQL */ `
  type Artist {
    id: ID!
    name: String!
    picture: String
    link: String
  }

  type Album {
    id: ID!
    title: String!
    cover: String
    link: String
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

  type Joke {
    id: ID!
    question: String!
    answer: String!
  }

  type Query {
    randomJoke: Joke!
    searchTracks(query: String!, limit: Int, index: Int): SearchTracksResult!
    track(id: ID!): Track
  }
`;
