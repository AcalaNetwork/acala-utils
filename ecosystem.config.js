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
      name: 'storage recoder',
      script: './node_modules/.bin/ts-node',
      args: './packages/apps/src/monitor.ts'
    }
  ]
};
