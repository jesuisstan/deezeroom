// GraphQL Queries as strings
import { INDEX_DEFAULT, LIMIT_DEFAULT } from '@/constants/deezer';

export const SEARCH_TRACKS = `
  query SearchTracks($query: String!, $limit: Int = ${LIMIT_DEFAULT}, $index: Int = ${INDEX_DEFAULT}) {
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
`;

export const GET_TRACK = `
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
`;
