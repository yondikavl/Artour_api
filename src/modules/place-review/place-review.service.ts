import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { type CreatePlaceReviewDto } from './dto/create-place-review.dto'
import prisma from '@/databases/prisma.db'
import { FileService } from '../file/file.service'
import { type FileEntity } from '@/entities/file.entity'
import { FileTypeEnum, type Prisma, UserRoleEnum, type PrismaClient } from '@prisma/client'
import { type PlaceReviewEntity } from '@/entities/place-review.entity'
import { BASE_URL_AVATARS, BASE_URL_MAP_CONTENTS, PATH_NO_PICTURE } from '@/constants/file-path'
import { type UpdatePlaceReviewDto } from './dto/update-place-review.dto'
import { APP_API_BASE_URL } from '@/constants/environments'

@Injectable()
export class PlaceReviewService {
    constructor (
        private readonly fileService: FileService
    ) {}

    /**
     * Create place review.
     */
    async createPlaceReview (userId: string, placeId: string, dto: CreatePlaceReviewDto): Promise<PlaceReviewEntity> {
        // Get and validate place.
        const place = await prisma.places.findUnique({
            where: { id: placeId }
        })
        if (place === null) throw new BadRequestException('Data lokasi tidak ditemukan!')

        // User canot multiple review.
        let placeReview = await prisma.placeReviews.findFirst({
            where: {
                placeId,
                userId
            }
        })
        if (placeReview !== null) throw new BadRequestException('Anda sudah memberi ulasan pada lokasi ini!')

        // Validate  image ids.
        const imageFiles: FileEntity[] = await prisma.files.findMany({
            where: {
                userId,
                id: {
                    in: dto.imageIds
                }
            }
        })

        // Start transaction.
        await prisma.$transaction(async (prismaTransaction: PrismaClient) => {
            // Create place review.
            placeReview = await prismaTransaction.placeReviews.create({
                data: {
                    placeId,
                    userId,
                    imageIds: imageFiles.map(item => item.id),
                    ...dto
                }
            })

            // Used image review files.
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: imageFiles.map(item => item.id)
                    }
                },
                data: {
                    type: FileTypeEnum.IMAGE_REVIEW,
                    used: true
                }
            })

            // Update place rating.
            await this.updatePlaceRating(placeId, prismaTransaction)
        })

        // Clear unused file.
        await this.fileService.deleteUnusedUserFiles(userId)

        // Done.
        return placeReview
    }

    /**
     * Get place reviews.
     */
    async getPlaceReviews (placeId: string | undefined, filter: string | undefined, limit: string | undefined): Promise<PlaceReviewEntity[]> {
        // Build query.
        const whereInput: Prisma.PlaceReviewsWhereInput = {
            placeId
        }
        let orderByInput: Prisma.Enumerable<Prisma.PlaceReviewsOrderByWithRelationInput> = [
            { createdAt: 'desc' }
        ]
        if (filter) {
            if (filter === 'rating_desc') {
                orderByInput = { rating: 'desc' }
            } else if (filter === 'rating_asc') {
                orderByInput = { rating: 'asc' }
            } else if (filter === 'rating_5') {
                whereInput.rating = 5
            } else if (filter === 'rating_4') {
                whereInput.rating = 4
            } else if (filter === 'rating_3') {
                whereInput.rating = 3
            } else if (filter === 'rating_2') {
                whereInput.rating = 2
            } else if (filter === 'rating_1') {
                whereInput.rating = 1
            }
        }

        // Get my review in this place.
        const placeReviews: PlaceReviewEntity[] = await prisma.placeReviews.findMany({
            where: whereInput,
            include: {
                user: true
            },
            orderBy: orderByInput,
            take: limit ? (parseInt(limit) || 500) : undefined
        })

        // Get place review images.
        const imageIds = placeReviews.map(item => item.imageIds).flat()
        const images: FileEntity[] = await prisma.files.findMany({
            where: {
                id: {
                    in: imageIds
                }
            }
        })
        for (const image of images) {
            // Build image link.
            const link = `${BASE_URL_MAP_CONTENTS}${image.filename}`
            image.link = link
        }

        // Build place review.
        for (const plaeaReview of placeReviews) {
            plaeaReview.images = images.filter(image => plaeaReview.imageIds.includes(image.id))
            delete plaeaReview.user.password

            // Build user avatar.
            const defaultUserAvatarLink = `${APP_API_BASE_URL}${PATH_NO_PICTURE}`
            if (plaeaReview.user.avatar === null) plaeaReview.user.avatar = defaultUserAvatarLink
            else plaeaReview.user.avatar = `${BASE_URL_AVATARS}${plaeaReview.user.avatar}`
        }

        // Done.
        return placeReviews
    }

    /**
     * Get my place review.
     */
    async getMyPlaceReview (userId: string, placeId: string): Promise<PlaceReviewEntity | null> {
        // Get my review in this place.
        const placeReview: PlaceReviewEntity = await prisma.placeReviews.findFirst({
            where: {
                placeId,
                userId
            },
            include: {
                user: true
            }
        })
        if (placeReview === null) return null

        // Get place review images.
        const images = await prisma.files.findMany({
            where: {
                id: {
                    in: placeReview.imageIds
                }
            }
        })
        placeReview.images = images.map(image => {
            const link = `${BASE_URL_MAP_CONTENTS}${image.filename}`
            return {
                ...image,
                link
            }
        })

        // Rebuild user data.
        delete placeReview.user.password
        // Build user avatar.
        const defaultUserAvatarLink = `${APP_API_BASE_URL}${PATH_NO_PICTURE}`
        if (placeReview.user.avatar === null) placeReview.user.avatar = defaultUserAvatarLink
        else placeReview.user.avatar = `${BASE_URL_AVATARS}${placeReview.user.avatar}`

        // Done.
        return placeReview
    }

    /**
     * Get my place reviews.
     */
    async getMyPlaceReviews (userId: string): Promise<any[]> {
        // Get my review list.
        const placeReviews: PlaceReviewEntity[] = await prisma.placeReviews.findMany({
            where: {
                userId
            },
            include: {
                place: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Get place image cover data
        const mapImageCoverIds = placeReviews.map(item => item.place?.mapImageCoverId).flat()
        const images: any[] = await prisma.files.findMany({
            where: {
                id: {
                    in: mapImageCoverIds
                }
            },
            select: {
                id: true,
                filename: true
            }
        })
        for (const image of images) {
            // Build image link.
            const link = `${BASE_URL_MAP_CONTENTS}${image.filename}`
            image.link = link
        }

        // Build place review.
        for (const placeReview of placeReviews) {
            placeReview.place.mapImageCover = images.find(image => image.id === placeReview.place?.mapImageCoverId)
        }

        // Done.
        return placeReviews.map((placeReview: any) => {
            const coverImageLink = placeReview.place.mapImageCover.link
            placeReview.place = {
                id: placeReview.place.id,
                name: placeReview.place.name,
                mapImageCover: {
                    link: coverImageLink
                }
            }
            return placeReview
        })
    }

    /**
     * Update place review.
     */
    async updatePlaceReview (userId: string, placeReviewId: string, dto: UpdatePlaceReviewDto): Promise<PlaceReviewEntity> {
        // Get and validate place review.
        let placeReview: PlaceReviewEntity = await prisma.placeReviews.findFirst({
            where: { id: placeReviewId, userId }
        })
        if (placeReview === null) throw new BadRequestException('Data ulasan lokasi tidak ditemukan!')

        // Validate image ids.
        const imageFiles: FileEntity[] = await prisma.files.findMany({
            where: {
                userId,
                id: {
                    in: dto.imageIds
                }
            }
        })

        // Start transaction.
        await prisma.$transaction(async (prismaTransaction: PrismaClient) => {
            // Unused image review files.
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: placeReview.imageIds
                    }
                },
                data: {
                    used: false
                }
            })

            // Update place review.
            placeReview = await prismaTransaction.placeReviews.update({
                where: { id: placeReviewId },
                data: {
                    rating: dto.rating,
                    content: dto.content,
                    imageIds: imageFiles.map(item => item.id)
                }
            })

            // Used image review files.
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: imageFiles.map(item => item.id)
                    }
                },
                data: {
                    type: FileTypeEnum.IMAGE_REVIEW,
                    used: true
                }
            })

            // Update place rating.
            await this.updatePlaceRating(placeReview.placeId, prismaTransaction)
        })

        // Clear unused file.
        await this.fileService.deleteUnusedUserFiles(userId)

        // Done.
        return placeReview
    }

    /**
     * Delete place review.
     */
    async deletePlaceReview (userId: string, placeReviewId: string): Promise<void> {
        // Get place review.
        const placeReview: PlaceReviewEntity = await prisma.placeReviews.findFirst({
            where: {
                id: placeReviewId
            }
        })
        if (placeReview === null) throw new BadRequestException('Data ulasan tidak ditemukan!')

        // Validate user.
        const user = await prisma.users.findUnique({ where: { id: userId } })
        if (user.role === UserRoleEnum.ADMIN) {
            // Do nothing and allow delete place review.
        } else {
            if (placeReview.userId !== userId) throw new ForbiddenException('Anda tidak diizinkan untuk menghapus data ini!')
        }

        // Start transaction.
        await prisma.$transaction(async (prismaTransaction: PrismaClient) => {
            // Delete place review.
            await prismaTransaction.placeReviews.delete({
                where: {
                    id: placeReviewId
                }
            })

            // Unused image review files.
            await prismaTransaction.files.updateMany({
                where: {
                    id: {
                        in: placeReview.imageIds
                    }
                },
                data: {
                    used: false
                }
            })

            // Update place rating.
            await this.updatePlaceRating(placeReview.placeId, prismaTransaction)
        })
    }

    /**
     * Update place rating.
     */
    async updatePlaceRating (placeId: string, prismaTransaction: PrismaClient): Promise<void> {
        // Calculate place review average.
        const placeReviews = await prismaTransaction.placeReviews.findMany({
            where: {
                placeId
            },
            select: {
                rating: true
            }
        })
        const totalRating = placeReviews.reduce((acc, item) => acc + item.rating, 0)
        const averageRating = (totalRating / placeReviews.length) || 0

        // Update place rating.
        await prismaTransaction.places.update({
            where: {
                id: placeId
            },
            data: {
                rating: averageRating
            }
        })
    }
}
