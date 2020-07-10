import * as Influx from 'influx';

const schema: Influx.ISchemaOptions[] = [
    {
        measurement: 'sync',
        fields: {
            blockNumber: Influx.FieldType.INTEGER,
            success: Influx.FieldType.BOOLEAN
        },
        tags: ['blockNumber']
    },
    {
        measurement: 'block',
        fields: {
            blockHash: Influx.FieldType.STRING,
            author: Influx.FieldType.STRING
        },
        tags: ['blockNumber'],
    },
    {
        measurement: 'extrinsic',
        fields: {
            method: Influx.FieldType.STRING,
            section: Influx.FieldType.STRING,
            args: Influx.FieldType.STRING,
            signer: Influx.FieldType.STRING,
            tip: Influx.FieldType.STRING,
            nonce: Influx.FieldType.STRING,
            result: Influx.FieldType.STRING
        },
        tags: ['blockNumber', 'hash']
    },
    {
        measurement: 'event',
        fields: {
            index: Influx.FieldType.INTEGER,
            section: Influx.FieldType.STRING,
            method: Influx.FieldType.STRING,
            args1: Influx.FieldType.STRING,
            args2: Influx.FieldType.STRING,
            args3: Influx.FieldType.STRING,
            args4: Influx.FieldType.STRING,
            args5: Influx.FieldType.STRING,
            args6: Influx.FieldType.STRING,
            args: Influx.FieldType.STRING
        },
        tags: ['blockNumber', 'index']
    },
    {
        measurement: 'price',
        fields: {
            price: Influx.FieldType.FLOAT
        },
        tags: ['blockNumber', 'asset']
    },
    {
        measurement: 'cdp',
        fields: {
            totalDebit: Influx.FieldType.FLOAT,
            totalCollateral: Influx.FieldType.FLOAT,
            collateralValue: Influx.FieldType.FLOAT,
            debitlValue: Influx.FieldType.FLOAT,
            collateralRatio: Influx.FieldType.FLOAT,
            debitExchangeRate: Influx.FieldType.FLOAT,
            maximumTotalDebitValue: Influx.FieldType.FLOAT,
            minimumDebitValue: Influx.FieldType.FLOAT,
            stabilityFee: Influx.FieldType.FLOAT,
            liquidationRatio: Influx.FieldType.FLOAT,
            liquidationPenalty: Influx.FieldType.FLOAT,
            requiredCollateralRatio: Influx.FieldType.FLOAT,
            stableFeeAPR: Influx.FieldType.FLOAT
        },
        tags: ['blockNumber', 'asset']
    },
    {
        measurement: 'collateral-auction',
        fields: {
            totalCollateral: Influx.FieldType.FLOAT,
            totalCollateralValue: Influx.FieldType.FLOAT
        },
        tags: ['blockNumber', 'asset']
    },
    {
        measurement: 'debit-auction',
        fields: {
            totalDebit: Influx.FieldType.FLOAT,
            totalDebitValue: Influx.FieldType.FLOAT,
            totalTarget: Influx.FieldType.FLOAT,
            totalTargetValue: Influx.FieldType.FLOAT
        },
        tags: ['blockNumber']
    },
    {
        measurement: 'surplus-auction',
        fields: {
            totalSurplus: Influx.FieldType.FLOAT,
            totalSurplusValue: Influx.FieldType.FLOAT,
        },
        tags: ['blockNumber']
    }
];

export default schema;