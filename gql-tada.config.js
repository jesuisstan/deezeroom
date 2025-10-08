module.exports = {
  schema: process.env.EXPO_PUBLIC_API_URL
    ? `${process.env.EXPO_PUBLIC_API_URL}/api/graphql`
    : 'http://localhost:8081/api/graphql',
  tadaOutputLocation: './graphql-env.d.ts'
};
