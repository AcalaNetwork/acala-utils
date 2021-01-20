import fs from 'fs/promises'
import path from 'path'
import toml from 'toml'

interface ConfigAttributes {
    db: { url: string }
    acala: { endpoint: string }
    web: { port: number }
    executors: { uri?: string; mnemonic?: string; name: string; password: string }[]
}

export default class Config implements ConfigAttributes {
    public db!: ConfigAttributes['db']
    public acala!: ConfigAttributes['acala']
    public executors!: ConfigAttributes['executors']
    public web!: ConfigAttributes['web']

    constructor (config: any) {
        this.db = config.db
        this.acala = config.acala
        this.executors = Object.keys(config.executor).map(key => ({ name: key, ...config.executor[key] }))
        this.web = config.web
    }

    static async create (filename: string = 'config.toml') {
        const content = await fs.readFile(path.join(__dirname, '../', filename), { encoding: 'utf-8' })

        const config = toml.parse(content)

        return new Config(config)
    }
}