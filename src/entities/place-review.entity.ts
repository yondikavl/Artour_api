import { type FileEntity } from './file.entity'
import { type PlaceEntity } from './place.entity'
import { type UserEntity } from './user.entity'

export class PlaceReviewEntity {
    id: string
    userId: string
    placeId: string
    rating: number
    content: string
    imageIds: any
    createdAt: Date
    updatedAt: Date

    user?: UserEntity
    place?: PlaceEntity
    images?: FileEntity[]
}
