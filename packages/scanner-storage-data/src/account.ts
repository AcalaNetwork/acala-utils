import { Model } from 'sequelize';

export class AccountModel extends Model {
    public 'account': string;
    public 'createAtBlock': number;
    public 'createAt': Date;
}