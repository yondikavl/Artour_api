import { type FileTypeEnum } from '@prisma/client'
import { type UserEntity } from './user.entity'

export class FileEntity {
    id: string
    userId: string
    type: FileTypeEnum
    originalName: string
    filename: string
    size: string
    mimetype: string
    used: boolean
    createdAt: Date
    updatedAt: Date

    link?: string
    user?: UserEntity
}
