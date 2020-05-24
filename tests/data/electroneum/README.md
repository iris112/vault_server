## Electroneum two nodes testnet

- Wallet RPC 1 at port 28082, executed with --rpc-login monerorpc:rpcpassword
- Wallet RPC 2 at port 38082, executed with --rpc-login monerorpc:rpcpassword

### Addresses

- Node 1: etnkALH736tXaxLNbDLLWi6xNEzzBJ2He5WSf7He8peuPt4nTyakAFyNuXqrHAGQt1PBSBonCRRj8daUtF7TPXFW42YQkSyzf3
- Node 2: etnkA3bLZWbhg2SxRS1FhjcyoM2FTYxmSjmvaBr7uXzz1b8Ms4M2h8PiKTL2YswTz1dFrV8ry5UQmBBLrb27tecs7MuNavV4bf

### Example RPC against Node 1:

```bash
curl -u monerorpc:rpcpassword --digest --data-binary '{"jsonrpc": "2.0", "id":"1", "method": "get_info", "params": [] }' -H 'content-type: application/json' -X POST http://127.0.0.1:28081/json_rpc
```

### Example Wallet RPC Node 1:

```bash
curl -u monerorpc:rpcpassword --digest --data-binary '{"jsonrpc": "2.0", "id":"1", "method": "getaddress", "params": [] }' -H 'content-type: application/json' -X POST http://127.0.0.1:28082/json_rpc
```
