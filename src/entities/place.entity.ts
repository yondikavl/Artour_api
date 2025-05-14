import { type UserEntity } from './user.entity'
import { type FileEntity } from './file.entity'
import { type PlaceStatusEnum } from '@prisma/client'
import { type PlaceCategoryEntity } from './place-category.entity'

export interface OpeningHoursDay {
    dayIndex: number // 0 - 6
    closed: boolean
    fullOpeningHours: boolean // full open 24h
    openingHours: string
    closingHours: string
}

export class PlaceEntity {
    id: string
    userId: string
    status: PlaceStatusEnum
    name: string
    description: string
    categoryId: string
    mapImageIds: any
    mapImageCoverId: string
    mapArImageCoverId: string
    latitude: number
    longitude: number
    address: string
    openingHours: OpeningHoursDay[] | any
    website?: string
    phone: string
    price: number
    rating: number
    views: number
    like: number
    dislike: number
    saved: number
    createdAt: Date
    updatedAt: Date

    user?: UserEntity
    category?: PlaceCategoryEntity
    mapImages?: FileEntity[]
    mapImageCover?: FileEntity
    mapArImageCover?: FileEntity
    hashtags?: string[]
}
