import * as path from 'path'
import * as sharp from 'sharp'
import { isValidCoordinate } from 'geolib'
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { FileTypeEnum, PlaceStatusEnum, type Prisma, UserRoleEnum } from '@prisma/client'
import prisma from '@/databases/prisma.db'
import { FileService } from '../file/file.service'
import { type FileEntity } from '@/entities/file.entity'
import { type UserEntity } from '@/entities/user.entity'
import { type EditPlaceDto } from './dto/edit-place.dto'
import { type PlaceEntity } from '@/entities/place.entity'
import { type CreatePlaceDto } from './dto/create-place.dto'
import { BASE_URL_AVATARS, BASE_URL_MAP_CONTENTS, PATH_NO_PICTURE } from '@/constants/file-path'
import { APP_API_BASE_URL } from '@/constants/environments'

@Injectable()
export class PlaceService {
    constructor (
        private readonly fileService: FileService
    ) {}

    /**
     * Create place.
     */
    async createPlace (userId: string, dto: CreatePlaceDto): Promise<PlaceEntity> {
        let place: PlaceEntity

        // Blok create place if is USER and review < 10
        const user = await prisma.users.findUnique({
            where: { id: userId }
        })
        if (user.role === UserRoleEnum.USER) {
            // Get review count.
            const reviewCount = await prisma.placeReviews.count({
                where: { userId }
            })
            if (reviewCount < 10) throw new BadRequestException('Anda harus memberikan review minimal 10 kali!')
        }

        // Validate coordinates.
        const coordinateIsValid = isValidCoordinate({ latitude: dto.latitude, longitude: dto.longitude })
        if (!coordinateIsValid) throw new BadRequestException('Koordinat tidak valid!')

        // Validate category id.
        const placeCategory = await prisma.placeCategories.findUnique({
            where: { id: dto.categoryId }
        })
        if (placeCategory === null) throw new BadRequestException('Kategori lokasi tidak ditemukan!')

        // Validate map image ids.
        const imageFiles: FileEntity[] = await prisma.files.findMany({
            where: {
                userId,
                id: {
                    in: dto.mapImageIds
                }
            },
            orderBy: { createdAt: 'asc' }
        })
        if (dto.mapImageIds.length < 4) throw new BadRequestException('Tambahkan mimimal 4 foto lokasi!')

        // Create ar map image cover id.
        const coverFile = imageFiles.find(item => item.id === dto.mapImageCoverId)
        if (coverFile === undefined) throw new BadRequestException('Gambar cover lokasi tidak ditemukan!')
        const directory = path.join(process.cwd(), 'storages', 'map-contents')
        const newFileName = coverFile.filename.replace('map-content-', 'map-ar-')

        // Store info in table file.
        const mapArCoverImage: FileEntity = await prisma.files.create({
            data: {
                userId,
                type: FileTypeEnum.IMAGE_MAP,
                originalName: coverFile.originalName,
                filename: newFileName,
                size: coverFile.size.toString(),
                mimetype: coverFile.mimetype,
                used: false
            }
        })
        imageFiles.push(mapArCoverImage)

        // Crop image to 1:1 aspect ratio.
        const sourceImagePath = path.join(directory, coverFile.filename)
        const destinationImagePath = path.join(directory, mapArCoverImage.filename)
        const sharpFileMeta = await sharp(sourceImagePath).metadata()
        const size = Math.min(sharpFileMeta.width, sharpFileMeta.height)
        const left = Math.floor((sharpFileMeta.width - size) / 2)
        const top = Math.floor((sharpFileMeta.height - size) / 2)
        await sharp(sourceImagePath)
            .extract({ width: size, height: size, left, top })
            .toFile(destinationImagePath)

        // Validate opening hours.
        if (dto.openingHours.length !== 7) throw new BadRequestException('Data waktu buka tutup lokasi tidak valid!')

        // Filter opening hours.
        dto.openingHours.forEach((item, index) => {
            item.dayIndex = index
        })

        // Start transactions.
        await prisma.$transaction(async (prismaTransaction) => {
            // Insert new place data.
            place = await prismaTransaction.places.create({
                data: {
                    userId,
                    status: PlaceStatusEnum.PUBLISHED,
                    name: dto.name,
                    description: dto.description,
                    categoryId: dto.categoryId,
                    mapImageIds: imageFiles.map(item => item.id),
                    mapImageCoverId: dto.mapImageCoverId,
                    mapArImageCoverId: mapArCoverImage.id,
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    address: dto.address,
                    openingHours: dto.openingHours as any,
                    website: dto.website,
                    phone: dto.phone,
                    price: dto.price
                }
            })

            // Filter hashtags.
            const hashtags = dto.hashtags.map(item => {
                item = item.trim().toLowerCase()
                item = item.replace(/[^a-z0-9_]/g, '_')
                return item
            })

            // Insert hashtags.
            for (const item of hashtags) {
                if (item === '') continue
                let hashtag = await prismaTransaction.hashtags.findFirst({ where: { name: item } })
                if (hashtag === null) {
                    hashtag = await prismaTransaction.hashtags.create({
                        data: { name: item }
                    })
                }
                await prismaTransaction.placeHashtags.create({
                    data: {
                        placeId: place.id,
                        hashtagId: hashtag.id
                    }
                })
            }

            // Update type and used files.
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: imageFiles.map(item => item.id)
                    }
                },
                data: {
                    type: FileTypeEnum.IMAGE_MAP,
                    used: true
                }
            })
        })

        // Clear unused file.
        await this.fileService.deleteUnusedUserFiles(userId)

        // Done.
        return place
    }

    /**
     * Get places.
     */
    async getPlaces (
        filter: string | undefined,
        keyword: string | undefined,
        limit: string | undefined
    ): Promise<any[]> {
        // Build filter and sort query.
        const whereInput: Prisma.PlacesWhereInput = {}
        let orderByInput: Prisma.PlacesOrderByWithRelationInput[] = [
            { updatedAt: 'desc' }
        ]
        if (keyword) {
            whereInput.name = {
                contains: keyword
            }
        }
        if (filter) {
            const orderByMap = {
                rating_desc: { rating: 'desc' },
                rating_asc: { rating: 'asc' },
                like_desc: { like: 'desc' },
                like_asc: { like: 'asc' },
                dislike_desc: { dislike: 'desc' },
                dislike_asc: { dislike: 'asc' },
                save_desc: { saved: 'desc' },
                save_asc: { saved: 'asc' },
                view_desc: { views: 'desc' },
                view_asc: { views: 'asc' }
            }
            if (Object.keys(orderByMap).includes(filter)) {
                orderByInput = [
                    orderByMap[filter]
                ]
            }
        }

        // Get places.
        const places: any[] = await prisma.places.findMany({
            where: whereInput,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: orderByInput,
            take: limit ? (parseInt(limit) || 500) : undefined
        })

        for (const place of places) {
            // Build user avatar.
            const defaultUserAvatarLink = `${APP_API_BASE_URL}${PATH_NO_PICTURE}`
            if (place.user.avatar === null) place.user.avatar = defaultUserAvatarLink
            else place.user.avatar = `${BASE_URL_AVATARS}${place.user.avatar}`

            // Remove unused data.
            delete place.mapImageIds
            delete place.openingHours
        }

        // Done.
        return places
    }

    /**
     * Get user places.
     */
    async getUserPlaces (userId: string): Promise<PlaceEntity[]> {
        const places: PlaceEntity[] = await prisma.places.findMany({
            where: {
                userId
            },
            orderBy: { updatedAt: 'desc' }
        })

        // Get place category.
        const categoryIds = places.map(item => item.categoryId)
        const categories = await prisma.placeCategories.findMany({
            where: {
                id: {
                    in: categoryIds
                }
            }
        })
        for (const place of places) {
            place.category = categories.find(item => item.id === place.categoryId)
        }

        // Generate map image and map image cover url.
        for (const place of places) {
            place.mapImages = await this.getMapImagesDataByPlaceId(place.id)
            const mapImageCover = place.mapImages.find(item => item.id === place.mapImageCoverId)
            place.mapImageCover = mapImageCover
        }

        // Done.
        return places
    }

    /**
     * Get place detail by id.
     */
    async getPlaceById (placeId: string): Promise<PlaceEntity> {
        const place: PlaceEntity = await prisma.places.findUnique({
            where: { id: placeId }
        })
        if (place === null) throw new BadRequestException('Data lokasi tidak ditemukan!')

        // Get place user.
        const { password, ...user }: UserEntity = await prisma.users.findUnique({
            where: { id: place.userId }
        })
        place.user = user

        // Get place category.
        place.category = await prisma.placeCategories.findUnique({
            where: { id: place.categoryId }
        })

        // Generate map image and map image cover url.
        place.mapImages = await this.getMapImagesDataByPlaceId(place.id)
        const mapImageCover = place.mapImages.find(item => item.id === place.mapImageCoverId)
        place.mapImageCover = mapImageCover

        // Get place hashtags.
        const hashtags = await prisma.placeHashtags.findMany({
            where: {
                placeId
            },
            select: {
                hashtag: {
                    select: {
                        name: true
                    }
                }
            }
        })
        place.hashtags = hashtags.map(item => item.hashtag.name)

        // Done.
        return place
    }

    /**
     * Get place images
     */
    async getPlaceImages (palceId: string): Promise<FileEntity[]> {
        let imageIds: string[] = []
        const files: FileEntity[] = []

        // Get place images.
        const place = await prisma.places.findUnique({
            where: { id: palceId }
        })
        if (!place) throw new BadRequestException('Data lokasi tidak ditemukan!')
        imageIds = [...place.mapImageIds as string[]]

        // Get review images.
        const reviews = await prisma.placeReviews.findMany({
            where: { placeId: palceId },
            orderBy: { createdAt: 'desc' }
        })
        for (const review of reviews) {
            imageIds = [...imageIds, ...review.imageIds as string[]]
        }

        // Get iumage data.
        const fileImages: FileEntity[] = await prisma.files.findMany({
            where: {
                id: {
                    in: imageIds
                }
            },
            include: {
                user: true
            }
        })

        // Rebuild image data.
        const fileObj: Record<string, FileEntity> = {}
        for (const image of fileImages) {
            image.link = `${BASE_URL_MAP_CONTENTS}${image.filename}`
            image.user.avatar = `${BASE_URL_AVATARS}${image.user.avatar}`
            delete image.user.password
            fileObj[image.id] = image
        }
        for (const imageId of imageIds) {
            files.push(fileObj[imageId])
        }

        // Done.
        return files
    }

    /**
     * Get user bookmarks
     */
    async getUserBookmarks (userId: string): Promise<PlaceEntity[]> {
        // Get user place bookmarks.
        const placeBookmarks = await prisma.placeBookmarks.findMany({
            where: {
                userId
            },
            select: {
                placeId: true
            },
            orderBy: { updatedAt: 'desc' }
        })

        // Get place data list.
        const places: PlaceEntity[] = await prisma.places.findMany({
            where: {
                id: {
                    in: placeBookmarks.map(item => item.placeId)
                }
            },
            include: {
                category: true,
                mapImageCover: true
            }
        })

        // Rebuild place data.
        for (const place of places) {
            // Build map image cover url.
            if (place.mapImageCover !== null) {
                place.mapImageCover.link = `${BASE_URL_MAP_CONTENTS}${place.mapImageCover.filename}`
            }
        }

        // Sort places by added.
        const placeShorted: PlaceEntity[] = []
        for (const bookmark of placeBookmarks) {
            const place = places.find(place => place.id === bookmark.placeId)
            if (place !== undefined) placeShorted.push(place)
        }

        // Done.
        return placeShorted
    }

    /**
     * Get map images data by place id.
     */
    async getMapImagesDataByPlaceId (placeId: string): Promise<FileEntity[]> {
        const place = await prisma.places.findUnique({
            where: { id: placeId }
        })
        if (place === null) throw new BadRequestException('Data lokasi tidak ditemukan!')

        // Get file image data.
        const files = await prisma.files.findMany({
            where: {
                id: {
                    in: place.mapImageIds as string[]
                }
            }
        })

        // Generate map image url.
        const fileImages = files.map(item => this.fileService.generateMapImageUrl(item))

        // Done.
        return fileImages
    }

    /**
     * Update user place by id.
     */
    async updatePlaceById (user: UserEntity, dto: EditPlaceDto, placeId: string): Promise<PlaceEntity> {
        // Find and validate place id.
        const place: PlaceEntity = await prisma.places.findUnique({
            where: {
                id: placeId
            }
        })
        if (place === null) throw new BadRequestException('Data lokasi tidak ditemukan!')

        // Validate user role access.
        if (user.role !== UserRoleEnum.ADMIN) {
            if (place.userId !== user.id) throw new ForbiddenException('Anda tidak memiliki akses ke lokasi ini!')
        }

        // Validate coordinates.
        const coordinateIsValid = isValidCoordinate({ latitude: dto.latitude, longitude: dto.longitude })
        if (!coordinateIsValid) throw new BadRequestException('Koordinat tidak valid!')

        // Validate category id.
        const placeCategory = await prisma.placeCategories.findUnique({
            where: { id: dto.categoryId }
        })
        if (placeCategory === null) throw new BadRequestException('Kategori lokasi tidak ditemukan!')

        // Validate map image ids.
        const imageFiles = await prisma.files.findMany({
            where: {
                userId: place.userId,
                id: {
                    in: dto.mapImageIds
                }
            },
            orderBy: { createdAt: 'asc' }
        })
        if (dto.mapImageIds.length < 4) throw new BadRequestException('Tambahkan mimimal 4 foto lokasi!')

        // Find unused map image ids.
        const unusedMapImageIds = place.mapImageIds.filter((id: string) => !dto.mapImageIds.includes(id))

        // Create ar map image cover id.
        let mapArCoverImageId = place.mapArImageCoverId
        if (dto.mapImageCoverId !== place.mapImageCoverId) {
            const coverFile = imageFiles.find(item => item.id === dto.mapImageCoverId)
            if (coverFile === undefined) throw new BadRequestException('Gambar cover lokasi tidak ditemukan!')
            const directory = path.join(process.cwd(), 'storages', 'map-contents')
            const newFileName = coverFile.filename.replace('map-content-', 'map-ar-')

            // Store info in table file.
            const mapArCoverImage: FileEntity = await prisma.files.create({
                data: {
                    userId: place.userId,
                    type: FileTypeEnum.IMAGE_MAP,
                    originalName: coverFile.originalName,
                    filename: newFileName,
                    size: coverFile.size.toString(),
                    mimetype: coverFile.mimetype,
                    used: false
                }
            })
            unusedMapImageIds.push(place.mapArImageCoverId)
            mapArCoverImageId = mapArCoverImage.id

            // Crop image to 1:1 aspect ratio.
            const sourceImagePath = path.join(directory, coverFile.filename)
            const destinationImagePath = path.join(directory, mapArCoverImage.filename)
            const sharpFileMeta = await sharp(sourceImagePath).metadata()
            const size = Math.min(sharpFileMeta.width, sharpFileMeta.height)
            const left = Math.floor((sharpFileMeta.width - size) / 2)
            const top = Math.floor((sharpFileMeta.height - size) / 2)
            await sharp(sourceImagePath)
                .extract({ width: size, height: size, left, top })
                .toFile(destinationImagePath)
        }

        // Validate opening hours.
        if (dto.openingHours.length !== 7) throw new BadRequestException('Data waktu buka tutup lokasi tidak valid!')

        // Filter opening hours.
        dto.openingHours.forEach((item, index) => {
            item.dayIndex = index
        })

        // Start transactions.
        await prisma.$transaction(async (prismaTransaction) => {
            // Update place.
            await prismaTransaction.places.update({
                where: { id: placeId },
                data: {
                    userId: place.userId,
                    status: PlaceStatusEnum.PUBLISHED,
                    name: dto.name,
                    description: dto.description,
                    categoryId: dto.categoryId,
                    mapImageIds: imageFiles.map(item => item.id),
                    mapImageCoverId: dto.mapImageCoverId,
                    mapArImageCoverId: mapArCoverImageId,
                    latitude: dto.latitude,
                    longitude: dto.longitude,
                    address: dto.address,
                    openingHours: dto.openingHours as any,
                    website: dto.website || null,
                    phone: dto.phone,
                    price: dto.price
                }
            })

            // Filter hashtags.
            const hashtags = dto.hashtags.map(item => {
                item = item.trim().toLowerCase()
                item = item.replace(/[^a-z0-9_]/g, '_')
                return item
            })

            // Update hashtags.
            await prismaTransaction.placeHashtags.deleteMany({
                where: {
                    placeId
                }
            })
            for (const item of hashtags) {
                if (item === '') continue
                let hashtag = await prismaTransaction.hashtags.findFirst({ where: { name: item } })
                if (hashtag === null) {
                    hashtag = await prismaTransaction.hashtags.create({
                        data: { name: item }
                    })
                }
                await prismaTransaction.placeHashtags.create({
                    data: {
                        placeId: place.id,
                        hashtagId: hashtag.id
                    }
                })
            }

            // Update type and used files.
            const usedImageFileIds = imageFiles.map(item => item.id)
            usedImageFileIds.push(mapArCoverImageId)
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: usedImageFileIds
                    }
                },
                data: {
                    type: FileTypeEnum.IMAGE_MAP,
                    used: true
                }
            })

            // Update unused map images.
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: unusedMapImageIds
                    }
                },
                data: {
                    used: false
                }
            })
        })

        // Clear unused file.
        await this.fileService.deleteUnusedUserFiles(place.userId)

        // Done.
        const placeUpdated = await prisma.places.findUnique({
            where: { id: placeId }
        })
        return placeUpdated
    }

    /**
     * Delete user place.
     */
    async deleteUserPlace (userId: string, placeId: string): Promise<void> {
        const place = await prisma.places.findUnique({
            where: { id: placeId }
        })
        if (place === null) throw new BadRequestException('Data lokasi tidak ditemukan!')

        // Validate user.
        const user = await prisma.users.findUnique({ where: { id: userId } })
        if (user.role === UserRoleEnum.ADMIN) {
            // Do nothing and allow delete place.
        } else {
            if (user.id !== place.userId) throw new ForbiddenException('Anda tidak diizinkan untuk menghapus lokasi ini!')
        }

        // Start transaction to remove place reviews.
        const placeReviews = await prisma.placeReviews.findMany({
            where: { placeId }
        })
        for (const placeReview of placeReviews) {
            await prisma.$transaction(async (prismaTransaction) => {
                // Unuse image files.
                const imageIds = placeReview.imageIds as string[]
                await prismaTransaction.files.updateMany({
                    where: {
                        id: {
                            in: imageIds
                        }
                    },
                    data: { used: false }
                })

                // Delete place reviews.
                await prismaTransaction.placeReviews.delete({ where: { id: placeReview.id } })
            })

            // Delete unused file.
            await this.fileService.deleteUnusedUserFiles(placeReview.userId)
        }

        // Start transactions to remove place.
        await prisma.$transaction(async (prismaTransaction) => {
            // Unuse map images.
            const filesIds = place.mapImageIds as string[]
            filesIds.push(place.mapImageCoverId)
            filesIds.push(place.mapArImageCoverId)
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: filesIds
                    }
                },
                data: { used: false }
            })

            // Delete place.
            await prismaTransaction.places.delete({
                where: { id: placeId }
            })
        })

        // Delete unused file.
        await this.fileService.deleteUnusedUserFiles(userId)
    }
}
