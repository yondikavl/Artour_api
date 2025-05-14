export interface AccessTokenPayload {
    sessionId: string
    userId: string
    email: string
}

export interface GoogleAuthUserPayload {
    name: string
    email: string
    avatar: string
}
