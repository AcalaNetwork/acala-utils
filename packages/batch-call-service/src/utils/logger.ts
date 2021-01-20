import winston from 'winston'

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => `${info.timestamp} | ${info.level}: ${JSON.stringify(info.message)}`)
    ),
    defaultMeta: { service: 'api-proxy-service' },
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
})
