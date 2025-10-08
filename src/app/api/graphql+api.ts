import { createSchema, createYoga } from 'graphql-yoga';

import { typeDefs } from '@/graphql/schema';
import { getRandomJoke } from '@/utils/jokes';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface APIContext {}

const schema = createSchema({
  typeDefs,
  resolvers: {
    Query: {
      randomJoke: async (_: any, __: any, ctx: APIContext) => {
        return getRandomJoke();
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
