import { createSchema, createYoga } from 'graphql-yoga';

import { INDEX_DEFAULT, LIMIT_DEFAULT } from '@/constants/deezer';
import { typeDefs } from '@/graphql/schema';
import { deezerService } from '@/utils/deezer/deezer-service';

// Using a type alias instead of an empty interface to satisfy no-empty-object-type rule.
// Extend later with auth/session if needed.
type APIContext = Record<string, unknown>;

const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      searchTracks: async (
        _: any,
        args: { query: string; limit?: number; index?: number },
        ctx: APIContext
      ) => {
        const { query, limit = LIMIT_DEFAULT, index = INDEX_DEFAULT } = args;
        return await deezerService.searchTracks(query, limit, index);
      },
      getPopularTracks: async (
        _: any,
        args: { limit?: number; index?: number },
        ctx: APIContext
      ) => {
        const { limit = LIMIT_DEFAULT, index = INDEX_DEFAULT } = args;
        return await deezerService.getPopularTracks(limit, index);
      },
      track: async (_: any, args: { id: string }, ctx: APIContext) => {
        const { id } = args;
        return await deezerService.getTrackById(id);
      },
      searchArtists: async (
        _: any,
        args: { query: string; limit?: number; index?: number },
        ctx: APIContext
      ) => {
        const { query, limit = LIMIT_DEFAULT, index = INDEX_DEFAULT } = args;
        return await deezerService.searchArtists(query, limit, index);
      },
      artistsByIds: async (
        _: any,
        args: { ids: string[] },
        ctx: APIContext
      ) => {
        const { ids } = args;
        return await deezerService.getArtistsByIds(ids);
      }
    }
  }
});

const { handleRequest } = createYoga<APIContext>({
  schema,
  context: async ({ request }): Promise<APIContext> => {
    return {};
  },
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response }
});

export async function POST(request: Request, context: any) {
  return handleRequest(request, context);
}

export async function GET(request: Request, context: any) {
  return handleRequest(request, context);
}
