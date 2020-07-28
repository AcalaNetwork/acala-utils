@acala-weaver/proxy-call-server

proxy sending extrinsic server

### api interface
1. add-call
```js
  type: POST
  params: {
    accessToken: string,
    data: {
      path: string, 
      params: string[]
      role: string // inner account role: faucet, sudo
      isSudoCall: boolean
    },
  }
  result: {
    taskId: string
  }
```
2. cancel-call
```js
  type: POST
  params: {
    accessToken: string,
    taskId: string
  }
  result: {
    result: boolean
  }
```

3. query-call
```js
  type: GET
  query: {
    taskId: string
  }
  result: {
    taskId: string,
    taskDetail: {
      path: string, 
      params: string[]
      role: string // inner account role: faucet, sudo
      isSudoCall: boolean
    },
    taskStatus: string,
    taskMsg: string
  }
```

4. query-call-queue
```js
  type: GET
  query: {
    status: string
  },
  result: [{
    taskId: string,
    taskDetail: {
      path: string, 
      params: string[]
      role: string // inner account role: faucet, sudo
      isSudoCall: boolean
    },
    taskStatus: string,
    taskMsg: string
  }]
```