export class SessionEntity {
    id: string
    userId: string
    ipAddress: string
    userAgent: string
    signoutAt?: Date
    createdAt: Date
    updatedAt: Date
}
