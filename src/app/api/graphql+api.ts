import { readFileSync } from 'fs';
import { createSchema, createYoga } from 'graphql-yoga';
import { join } from 'path';

import { getRandomJoke } from '@/utils/jokes';

interface APIContext {}

// Read schema from file
const typeDefs = readFileSync(join(process.cwd(), 'schema.graphql'), 'utf8');

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
