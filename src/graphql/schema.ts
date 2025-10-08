// GraphQL Schema Definition
export const typeDefs = /* GraphQL */ `
  type Joke {
    id: ID!
    question: String!
    answer: String!
  }

  type Query {
    randomJoke: Joke!
  }
`;
