@acala-weaver/cached-storage

1. cached-block
  datatype: STRING, key_rule: BLOCK_{block_number}
2. extrinsics
  datatype: STRING, key_rule: EXTRINSIC_{block_number}
3. events
  datatype: STRING, key_rule: EVENT_{block_number}_{index}
4. job:
  datatype: STRING, key_rule: {FROM}_{TO}_{job_type}_{params}
5. job_error:
  datatype: STRING, key_ruls: {job}_{block}