import { Sequelize, DataTypes, Model } from 'sequelize';

export class AuctionModel extends Model {
    public auctionId!: number;
    public auctionType!: 'collateral' | 'debit' | 'surplus';

    // aution information
    public startAtBlock!: number;
    public currencyId!: string;
    public amount!: string;
    public rawData!: unknown; // for deferent type auction

    // auction dealed information
    public endAtBlock!: number;
    public endBalance!: string; // auction target currency balance when auction ended
    public endAmount!: string; // payment amount
    public winner!: string; // auction winner

    public status!: 'progress' | 'end' | 'cancel';

    // base index
    public createAtBlock!: number;
    public createAtBlockHahs!: string;
    public createAt!: Date;
}

export function initAuctionModel (db: Sequelize): Model {
    return AuctionModel.init({
        auctionId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            allowNull: false
        },
        auctionType: {
            type: DataTypes.ENUM('collateral', 'debit', 'surplus')
        },
        startAtBlock: {
            type: DataTypes.BIGINT,
        },
        currencyId: {
            type: DataTypes.STRING
        },
        amount: {
            type: DataTypes.STRING
        },
        rawData: {
            type: DataTypes.JSON
        },
        endAtBlock: {
            type: DataTypes.BIGINT
        },
        endBalance: {
            type: DataTypes.STRING
        },
        endAmount: {
            type: DataTypes.STRING
        },
        winner: {
            type: DataTypes.STRING
        },
        status: {
            type: DataTypes.ENUM('progress', 'end', 'cancel')
        },

        createAtBlcok: {
            type: DataTypes.INTEGER
        },
        createAtBlcokHash: {
            type: DataTypes.STRING
        },
        createAt: {
            type: DataTypes.DATE
        }
    }, {
        sequelize: db,
        tableName: 'auction',
        timestamps: false
    });
}