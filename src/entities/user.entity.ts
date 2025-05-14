import { type UserRoleEnum } from '@prisma/client'

export interface UserMeta {
    reviews?: number
    isSuperAdmin?: boolean
}

export interface ContributionSummary {
    placeTotal: number
    reviewTotal: number
}

export class UserEntity {
    id: string
    avatar?: string
    role: UserRoleEnum
    name: string
    email: string
    password?: string
    active: boolean
    lastLoginAt?: Date
    createdAt: Date
    updatedAt: Date

    userMeta?: UserMeta
    contributionSummary?: ContributionSummary
}
