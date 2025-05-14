import { type PlaceEntity } from './place.entity'

export class PlaceCategoryEntity {
    id: string
    name: string
    description: string
    mapMarker: string
    createdAt: Date
    updatedAt: Date

    popularPlace?: PlaceEntity
    mapMarkerLink?: string
}
