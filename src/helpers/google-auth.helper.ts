import { auth } from 'googleapis/build/src/apis/oauth2'
import { APP_API_BASE_URL, GOOGLE_AUTH_CLIENT_ID, GOOGLE_AUTH_CLIENT_SECRET } from '@/constants/environments'

export const GOOGLE_AUTH_SCOPES: string[] = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

/**
 * Create oAuth2 Client.
 */
const callbackUrl = `${APP_API_BASE_URL}/auth/google/callback`
export const oAuth2Client = new auth.OAuth2(
    GOOGLE_AUTH_CLIENT_ID,
    GOOGLE_AUTH_CLIENT_SECRET,
    callbackUrl
)
