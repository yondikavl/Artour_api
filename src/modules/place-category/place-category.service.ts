import * as fs from 'fs'
import * as path from 'path'
import prisma from '@/databases/prisma.db'
import { Injectable, NotFoundException } from '@nestjs/common'
import { BASE_URL_MAP_CONTENTS } from '@/constants/file-path'
import { type PlaceCategoryEntity } from '@/entities/place-category.entity'
import { type CreatePlaceCategoryDto } from './dto/create-place-category.dto'
import { type PlaceEntity } from '@/entities/place.entity'
import { generateMapMarkerLink } from '@/helpers/file.helper'

@Injectable()
export class PlaceCategoryService {
    /**
     * Get place category by id.
     */
    async getPlaceCategoryById (placeCategoryId: string, validate: boolean = true): Promise<PlaceCategoryEntity> {
        const placeCategory = await prisma.placeCategories.findUnique({
            where: { id: placeCategoryId }
        })
        if (validate && placeCategory === null) {
            throw new NotFoundException('Kategori lokasi tidak ditemukan!')
        }
        return placeCategory
    }

    /**
     * Create place category.
     */
    async createPlaceCategory (dto: CreatePlaceCategoryDto, mapMarker: Express.Multer.File): Promise<PlaceCategoryEntity> {
        const placeCategory: PlaceCategoryEntity = await prisma.placeCategories.create({
            data: {
                name: dto.name,
                description: dto.description,
                mapMarker: mapMarker.filename
            }
        })
        placeCategory.mapMarkerLink = generateMapMarkerLink(placeCategory.mapMarker)
        return placeCategory
    }

    /**
     * Get place categories.
     */
    async getPlaceCategories (withPopularPlace: boolean): Promise<PlaceCategoryEntity[]> {
        // Get data.
        const placeCategories: PlaceCategoryEntity[] = await prisma.placeCategories.findMany({
            orderBy: { updatedAt: 'desc' }
        })

        // Rebuild data.
        for (const placeCategory of placeCategories) {
            placeCategory.mapMarkerLink = generateMapMarkerLink(placeCategory.mapMarker)
        }

        // Add popular place.
        if (withPopularPlace) {
            for (const placeCategory of placeCategories) {
                // Get popular place in category.
                const place: PlaceEntity = await prisma.places.findFirst({
                    where: {
                        AND: [
                            { categoryId: placeCategory.id },
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
                        mapImageCover: true
                    }
                })
                if (place === null) continue
                if (place.mapImageCover !== null) {
                    place.mapImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapImageCover.filename}`
                }
                placeCategory.popularPlace = place
            }
        }

        // Done.
        return placeCategories
    }

    /**
     * Update place category by id.
     */
    async updatePlaceCategory (placeCategoryId: string, mapMarker: Express.Multer.File | undefined, dto: CreatePlaceCategoryDto): Promise<PlaceCategoryEntity> {
        // Delete old map marker in storage.
        const placeCategoryOld: PlaceCategoryEntity = await this.getPlaceCategoryById(placeCategoryId, false)
        if (placeCategoryOld !== null && mapMarker !== undefined) {
            const oldMapMarkerPath = path.join(process.cwd(), 'storages', 'map-markers', placeCategoryOld.mapMarker)
            if (fs.existsSync(oldMapMarkerPath)) {
                fs.unlinkSync(oldMapMarkerPath)
            }
        }

        // Update.
        const placeCategory: PlaceCategoryEntity = await prisma.placeCategories.update({
            where: { id: placeCategoryId },
            data: {
                name: dto.name,
                description: dto.description,
                mapMarker: (mapMarker !== undefined) ? mapMarker.filename : placeCategoryOld.mapMarker
            }
        })
        placeCategory.mapMarkerLink = generateMapMarkerLink(placeCategory.mapMarker)
        return placeCategory
    }

    /**
     * Delete place category by id.
     */
    async deletePlaceCategory (placeCategoryId: string): Promise<void> {
        // Delete old map marker in storage.
        const placeCategoryOld: PlaceCategoryEntity = await this.getPlaceCategoryById(placeCategoryId, false)
        if (placeCategoryOld !== null) {
            const oldMapMarkerPath = path.join(process.cwd(), 'storages', 'map-markers', placeCategoryOld.mapMarker)
            if (fs.existsSync(oldMapMarkerPath)) {
                fs.unlinkSync(oldMapMarkerPath)
            }
        }

        // Delete data.
        await prisma.placeCategories.delete({
            where: { id: placeCategoryId }
        })
    }
}
