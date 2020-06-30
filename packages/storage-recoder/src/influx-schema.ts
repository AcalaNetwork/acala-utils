import * as Influx from 'influx';

export default [
    {
        measurement: 'block',
        fields: {
            blockHash: Influx.FieldType.STRING,
            author: Influx.FieldType.STRING
        },
        tags: [
            'number'
        ]
    },
    {
        measurement: 'extrinsic',
        fields: {
            hash: Influx.FieldType.STRING,
            method: Influx.FieldType.STRING,
            section: Influx.FieldType.STRING,
            args: Influx.FieldType.STRING,
            signer: Influx.FieldType.STRING,
            tip: Influx.FieldType.STRING,
            nonce: Influx.FieldType.STRING
        },
        tags: [ 'blockNumber' ]
    }
] as Influx.ISchemaOptions[];