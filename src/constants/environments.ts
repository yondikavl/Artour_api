import * as dotenv from 'dotenv'

dotenv.config()

/**
 * Application
 */
export const APP_ROOT_PATH: string = process.cwd()
export const APP_PORT: number = Number(process.env.APP_PORT) ?? 8000
export const APP_WEB_BASE_URL: string = process.env.APP_WEB_BASE_URL ?? 'http://localhost:5173'
export const APP_API_BASE_URL: string = process.env.APP_API_BASE_URL ?? 'app_default'
export const APP_FREEZE: boolean = (process.env.APP_FREEZE === 'true')

/**
 * Databases
 */
export const MAIN_DATABASE_URL: string = process.env.MAIN_DATABASE_URL

/**
 * Private Keys
 */
export const GOOGLE_AUTH_CLIENT_ID: string = process.env.GOOGLE_AUTH_CLIENT_ID
export const GOOGLE_AUTH_CLIENT_SECRET: string = process.env.GOOGLE_AUTH_CLIENT_SECRET
export const JWT_SECRET_KEY: string = process.env.JWT_SECRET_KEY

/**
 * Admin mails.
 */
export const SUPER_ADMIN_MAILS: string[] = process.env.SUPER_ADMIN_MAILS ? process.env.SUPER_ADMIN_MAILS.split(',') : []

/**
 * Time Zone
 */
export const TZ: string = process.env.TZ
