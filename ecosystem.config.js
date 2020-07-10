module.exports = {
  apps : [
    {
      name: 'graphql service',
      script: './node_modules/.bin/ts-node',
      args: './packages/apps/src/graphql.ts'
    },
    {
      name: 'chain recoder',
      script: './node_modules/.bin/ts-node',
      args: './packages/apps/src/chain.ts'
    },
    {
      name: 'ausd mover acala',
      script: './node_modules/.bin/ts-node',
      args: './packages/apps/src/ausd-acala.ts'
    },
    {
      name: 'ausd mover laminar',
      script: './node_modules/.bin/ts-node',
      args: './packages/apps/src/ausd-laminar.ts'
    }
  ]
};
