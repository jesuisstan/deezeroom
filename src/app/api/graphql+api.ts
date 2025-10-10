import { createSchema, createYoga } from 'graphql-yoga';

import { typeDefs } from '@/graphql/schema';
import { deezerService } from '@/utils/deezer-service';
import { getRandomJoke } from '@/utils/jokes';

interface APIContext {
  // Context can be extended in the future
}

const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      randomJoke: async (_: any, __: any, ctx: APIContext) => {
        return getRandomJoke();
      },
      searchTracks: async (
        _: any,
        args: { query: string; limit?: number; index?: number },
        ctx: APIContext
      ) => {
        const { query, limit = 25, index = 0 } = args;
        return await deezerService.searchTracks(query, limit, index);
      },
      track: async (_: any, args: { id: string }, ctx: APIContext) => {
        const { id } = args;
        return await deezerService.getTrackById(id);
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
