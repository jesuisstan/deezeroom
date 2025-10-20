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
          pictureSmall
          pictureMedium
         
          pictureXl
          link
        }
        album {
          id
          title
          cover
          coverSmall
          coverMedium
          coverBig
          coverXl
          link
          tracklist
        }
      }
      total
      hasMore
    }
  }
`;

export const GET_POPULAR_TRACKS = `
  query GetPopularTracks($limit: Int = ${LIMIT_DEFAULT}) {
    getPopularTracks(limit: $limit) {
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
          pictureSmall
          pictureMedium
          pictureBig
          pictureXl
          link
        }
        album {
          id
          title
          cover
          coverSmall
          coverMedium
          coverBig
          coverXl
          link
          tracklist
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
        pictureSmall
        pictureMedium
        pictureBig
        pictureXl
        link
      }
      album {
        id
        title
        cover
        coverSmall
        coverMedium
        coverBig
        coverXl
        link
        tracklist
      }
    }
  }
`;

export const SEARCH_ARTISTS = `
  query SearchArtists($query: String!, $limit: Int = ${LIMIT_DEFAULT}, $index: Int = ${INDEX_DEFAULT}) {
    searchArtists(query: $query, limit: $limit, index: $index) {
      artists {
        id
        name
        picture
        pictureSmall
        pictureMedium
        pictureBig
        pictureXl
        link
      }
      total
      hasMore
    }
  }
`;
