import { graphql, ResultOf } from 'gql.tada';

export const GetRandomJoke = graphql(`
  query GetRandomJoke {
    randomJoke {
      id
      question
      answer
    }
  }
`);

export const SearchTracks = graphql(`
  query SearchTracks($query: String!, $limit: Int, $index: Int) {
    searchTracks(query: $query, limit: $limit, index: $index) {
      tracks {
        id
        title
        titleShort
        duration
        preview
        explicitLyrics
        artist {
          id
          name
          picture
          link
        }
        album {
          id
          title
          cover
          link
        }
      }
      total
      hasMore
    }
  }
`);

export const GetTrack = graphql(`
  query GetTrack($id: ID!) {
    track(id: $id) {
      id
      title
      titleShort
      duration
      preview
      explicitLyrics
      artist {
        id
        name
        picture
        link
      }
      album {
        id
        title
        cover
        link
      }
    }
  }
`);

export type Joke = ResultOf<typeof GetRandomJoke>;
export type SearchTracksResult = ResultOf<typeof SearchTracks>;
export type TrackResult = ResultOf<typeof GetTrack>;
