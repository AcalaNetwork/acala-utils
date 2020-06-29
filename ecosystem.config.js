module.exports = {
  apps : [
    {
      name      : 'graphql service',
      script    : './node_modules/.bin/ts-node',
      args       : './packages/acala/src/graphql.ts'
    },
    {
      name      : 'sync service',
      script    : './node_modules/.bin/ts-node',
      args       : './packages/acala/src/sync.ts'
    }
  ]
};
