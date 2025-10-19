import { createSchema, createYoga } from 'graphql-yoga';

import { INDEX_DEFAULT, LIMIT_DEFAULT } from '@/constants/deezer';
import { typeDefs } from '@/graphql/schema';
import { deezerService } from '@/utils/deezer/deezer-service';

interface APIContext {
  // Context can be extended in the future
}

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
        args: { limit?: number },
        ctx: APIContext
      ) => {
        const { limit = LIMIT_DEFAULT } = args;
        return await deezerService.getPopularTracks(limit);
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
