import { getDistance } from 'geolib'
import prisma from '@/databases/prisma.db'
import { Injectable, NotFoundException } from '@nestjs/common'
import { type PlaceEntity } from '@/entities/place.entity'
import { type Coordinates } from './interfaces/Geolocation'
import { type ArMapSearchPlaceDto } from './dto/ar-map-search-place.dto'
import { BASE_URL_MAP_CONTENTS } from '@/constants/file-path'
import { type NearestSearchPlaceDto } from './dto/nearest-search-place.dto'
import { type MapSearchPlaceDto } from './dto/map-search-place.dto'
import { generateMapMarkerLink } from '@/helpers/file.helper'

@Injectable()
export class PlaceSearchService {
    /**
     * Get highlighted places by rating, like, and saved.
     */
    async getHighlightPlaces (): Promise<PlaceEntity[]> {
        // Get places.
        const places: PlaceEntity[] = await prisma.places.findMany({
            where: {
                AND: [
                    { status: 'PUBLISHED' },
                    { dislike: { lt: 5 } }
                ]
            },
            orderBy: [
                { rating: 'desc' },
                { like: 'desc' },
                { saved: 'desc' }
            ],
            include: {
                category: true,
                mapImageCover: true
            },
            take: 25
        })

        // Rebuild place data.
        for (const place of places) {
            // Build map marker category url.
            if (place.category !== null) {
                place.category.mapMarker = generateMapMarkerLink(place.category.mapMarker)
            }

            // Build map image cover url.
            if (place.mapImageCover !== null) {
                place.mapImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapImageCover.filename}`
            }
        }

        // Done.
        return places
    }

    /**
     * Get nearest places by user coordinates.
     */
    async getNearesetPlaces (dto: NearestSearchPlaceDto): Promise<PlaceEntity[]> {
        // Get all places.
        const places = await prisma.places.findMany({
            where: {
                AND: [
                    { status: 'PUBLISHED' },
                    { dislike: { lt: 5 } }
                ]
            },
            select: {
                id: true,
                latitude: true,
                longitude: true
            }
        })

        // Sort places by distance.
        const placeDistances = [] as Array<{ placeId: string, distance: number }>
        const myCoord: Coordinates = { latitude: dto.latitude, longitude: dto.longitude }
        for (const place of places) {
            const placeCoord: Coordinates = { latitude: place.latitude, longitude: place.longitude }
            const distanceInMater = getDistance(myCoord, placeCoord)
            placeDistances.push({ placeId: place.id, distance: distanceInMater })
        }
        placeDistances.sort((a, b) => a.distance - b.distance)

        // Get 50 nearest places.
        const placesIds = placeDistances.slice(0, 50).map(item => item.placeId)
        const nearestPlaces: PlaceEntity[] = await prisma.places.findMany({
            where: {
                id: {
                    in: placesIds
                }
            },
            include: {
                category: true,
                mapImageCover: true
            }
        })

        // Rebuild place data.
        const placeObject: Record<string, PlaceEntity> = {}
        for (const place of nearestPlaces) {
            // Build map image cover url.
            if (place.mapImageCover !== null) {
                place.mapImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapImageCover.filename}`
            }
            placeObject[place.id] = place
        }

        // Sort nearest places by distance.
        const nearestPlacesShorted: PlaceEntity[] = []
        for (const placeId of placesIds) {
            const placeEntity = placeObject[placeId]
            nearestPlacesShorted.push(placeEntity)
        }

        // Done.
        return nearestPlacesShorted
    }

    /**
     * Get nearest places by place coordinates and same category in radius 100KM.
     */
    async getNearestPlacesByPlaceLocation (placeId: string): Promise<PlaceEntity[]> {
        // Get place info.
        const place = await prisma.places.findUnique({
            where: { id: placeId }
        })
        if (place === null) throw new NotFoundException('Data lokasi tidak ditemukan!')

        // Get all places in same category.
        const places = await prisma.places.findMany({
            where: {
                AND: [
                    { status: 'PUBLISHED' },
                    { dislike: { lt: 5 } },
                    { categoryId: place.categoryId },
                    { id: { not: placeId } }
                ]
            },
            select: {
                id: true,
                latitude: true,
                longitude: true
            }
        })

        // Sort places by distance.
        const placeDistances = [] as Array<{ placeId: string, distance: number }>
        const myCoord: Coordinates = { latitude: place.latitude, longitude: place.longitude }
        for (const place of places) {
            const placeCoord: Coordinates = { latitude: place.latitude, longitude: place.longitude }
            const distanceInMater = getDistance(myCoord, placeCoord)
            placeDistances.push({ placeId: place.id, distance: distanceInMater })
        }
        placeDistances.sort((a, b) => a.distance - b.distance)

        // Filter places by distance.
        const filterRadiusInKm = 100
        const placeFilterDinstances = placeDistances.filter(item => item.distance <= filterRadiusInKm * 1000) as Array<{ placeId: string, distance: number }>

        // Get 50 nearest places.
        const placesIds = placeFilterDinstances.slice(0, 50).map(item => item.placeId)
        const nearestPlaces: PlaceEntity[] = await prisma.places.findMany({
            where: {
                id: {
                    in: placesIds
                }
            },
            include: {
                category: true,
                mapImageCover: true
            }
        })

        // Rebuild place data.
        const placeObject: Record<string, PlaceEntity> = {}
        for (const place of nearestPlaces) {
            // Build map marker url.
            if (place.category !== null) {
                place.category.mapMarker = generateMapMarkerLink(place.category.mapMarker)
            }

            // Build map image cover url.
            if (place.mapImageCover !== null) {
                place.mapImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapImageCover.filename}`
            }

            // Save to object.
            placeObject[place.id] = place
        }

        // Sort nearest places by distance.
        const nearestPlacesShorted: PlaceEntity[] = []
        for (const placeId of placesIds) {
            const placeEntity = placeObject[placeId]
            nearestPlacesShorted.push(placeEntity)
        }

        // Done.
        return nearestPlacesShorted
    }

    /**
     * Get place by search keyword.
     */
    async getPlacesByKeyword (keyword: string, dto: MapSearchPlaceDto): Promise<PlaceEntity[]> {
        const keywordLower = keyword.toLowerCase()

        // Get categories by keyword.
        const categories = await prisma.placeCategories.findMany({
            where: {
                OR: [
                    { name: { contains: keywordLower } },
                    { description: { contains: keywordLower } }
                ]
            },
            select: { id: true, name: true },
            take: 3
        })
        const categoryIds = categories.map(item => item.id)

        // Get places.
        const places: PlaceEntity[] = await prisma.places.findMany({
            where: {
                AND: [
                    { status: 'PUBLISHED' },
                    { dislike: { lt: 5 } },
                    {
                        OR: [
                            { name: { contains: keywordLower } },
                            { description: { contains: keywordLower } },
                            { categoryId: { in: categoryIds } }
                        ]
                    }
                ]
            },
            orderBy: [
                { rating: 'desc' },
                { like: 'desc' }
            ],
            include: {
                category: true,
                mapImageCover: true
            },
            take: 100
        })

        // Sort places by distance.
        const placeDistances = [] as Array<{ placeId: string, distance: number }>
        const myCoord: Coordinates = { latitude: dto.latitude, longitude: dto.longitude }
        for (const place of places) {
            const placeCoord: Coordinates = { latitude: place.latitude, longitude: place.longitude }
            const distanceInKm = getDistance(myCoord, placeCoord) / 1000
            placeDistances.push({ placeId: place.id, distance: distanceInKm })
        }
        placeDistances.sort((a, b) => a.distance - b.distance)

        // Filter places by distance.
        const filterRadiusInKm = 300
        const placeFilterDinstances = placeDistances.filter(item => item.distance <= filterRadiusInKm) as Array<{ placeId: string, distance: number }>

        // Rebuild place data.
        const resultPlaces: PlaceEntity[] = []
        for (const item of placeFilterDinstances) {
            const place = places.find(place => place.id === item.placeId)

            // Build map marker category url.
            if (place.category !== null) {
                place.category.mapMarker = generateMapMarkerLink(place.category.mapMarker)
            }

            // Build map image cover url.
            if (place.mapImageCover !== null) {
                place.mapImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapImageCover.filename}`
            }

            // Add to array.
            resultPlaces.push(place)
        }

        // Done.
        return resultPlaces
    }

    /**
     * Get places for ar map.
     */
    async getPlacesForArMap (dto: ArMapSearchPlaceDto): Promise<PlaceEntity[]> {
        // Get all places.
        const places = await prisma.places.findMany({
            where: {
                AND: [
                    { status: 'PUBLISHED' },
                    { dislike: { lt: 5 } }
                ]
            },
            select: {
                id: true,
                latitude: true,
                longitude: true
            }
        })

        // Sort places by distance.
        const placeDistances = [] as Array<{ placeId: string, distance: number }>
        const myCoord: Coordinates = { latitude: dto.latitude, longitude: dto.longitude }
        for (const place of places) {
            const placeCoord: Coordinates = { latitude: place.latitude, longitude: place.longitude }
            const distanceInMater = getDistance(myCoord, placeCoord)
            placeDistances.push({ placeId: place.id, distance: distanceInMater })
        }
        placeDistances.sort((a, b) => a.distance - b.distance)

        // Get 3 nearest places.
        const placesIds = placeDistances.slice(0, 3).map(item => item.placeId)
        const nearestPlaces: PlaceEntity[] = await prisma.places.findMany({
            where: {
                id: {
                    in: placesIds
                }
            },
            include: {
                mapArImageCover: true
            }
        })

        // Rebuild place data.
        const placeObject: Record<string, PlaceEntity> = {}
        for (const place of nearestPlaces) {
            // Build map ar image cover url.
            if (place.mapArImageCover !== null) {
                place.mapArImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapArImageCover.filename}`
            }
            placeObject[place.id] = place
        }

        // Sort nearest places by distance.
        const nearestPlacesShorted: PlaceEntity[] = []
        for (const placeId of placesIds) {
            const placeEntity = placeObject[placeId]
            nearestPlacesShorted.push(placeEntity)
        }

        // Done.
        return nearestPlacesShorted
    }
}
