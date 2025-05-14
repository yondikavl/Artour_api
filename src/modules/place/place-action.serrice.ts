import prisma from '@/databases/prisma.db'
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class PlaceActionService {
    /**
     * Get place action metadata.
     */
    async getPlaceActionMetaData (userId: string, placeId: string): Promise<any> {
        // Get place data.
        const place = await prisma.places.findUnique({
            where: { id: placeId }
        })
        if (place === null) {
            throw new BadRequestException('Data lokasi tidak ditemukan!')
        }

        // Check user action.
        const likeCount = await prisma.placeLikes.count({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })
        const dislikeCount = await prisma.placeDislikes.count({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })
        const savedCount = await prisma.placeBookmarks.count({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })

        // Make place action metadata.
        const metaData = {
            like: {
                count: place.like,
                setted: (likeCount > 0)
            },
            dislike: {
                count: place.dislike,
                setted: (dislikeCount > 0)
            },
            saved: {
                count: place.saved,
                setted: savedCount > 0
            }
        }

        // Done.
        return metaData
    }

    /**
     * User like a place.
     */
    async likePlace (userId: string, placeId: string): Promise<void> {
        // Check place data.
        const place = await prisma.places.findUnique({ where: { id: placeId } })
        if (place === null) {
            throw new NotFoundException('Data lokasi tidak ditemukan!')
        }

        // Remove dislike if exist.
        const placeDislike = await prisma.placeDislikes.findFirst({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })
        if (placeDislike !== null) {
            await prisma.$transaction(async (prismaTransaction) => {
                await prismaTransaction.placeDislikes.delete({
                    where: {
                        id: placeDislike.id
                    }
                })
                await prismaTransaction.places.update({
                    where: { id: placeId },
                    data: {
                        dislike: {
                            decrement: 1
                        }
                    }
                })
            })
        }

        // Check current like.
        const placeLike = await prisma.placeLikes.findFirst({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })

        // Delete like if exist.
        if (placeLike !== null) {
            await prisma.$transaction(async (prismaTransaction) => {
                await prismaTransaction.placeLikes.delete({
                    where: { id: placeLike.id }
                })
                await prismaTransaction.places.update({
                    where: { id: placeId },
                    data: {
                        like: {
                            decrement: 1
                        }
                    }
                })
            })
            return
        }

        // Add like.
        await prisma.$transaction(async (prismaTransaction) => {
            await prismaTransaction.placeLikes.create({
                data: { placeId, userId }
            })
            await prismaTransaction.places.update({
                where: { id: placeId },
                data: {
                    like: {
                        increment: 1
                    }
                }
            })
        })
    }

    /**
     * User dislike a place.
     */
    async dislikePlace (userId: string, placeId: string): Promise<void> {
        // Check place data.
        const place = await prisma.places.findUnique({ where: { id: placeId } })
        if (place === null) {
            throw new NotFoundException('Data lokasi tidak ditemukan!')
        }

        // Remove like if exist.
        const placeLike = await prisma.placeLikes.findFirst({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })
        if (placeLike !== null) {
            await prisma.$transaction(async (prismaTransaction) => {
                await prismaTransaction.placeLikes.delete({
                    where: {
                        id: placeLike.id
                    }
                })
                await prismaTransaction.places.update({
                    where: { id: placeId },
                    data: {
                        like: {
                            decrement: 1
                        }
                    }
                })
            })
        }

        // Check current dislike.
        const placeDislike = await prisma.placeDislikes.findFirst({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })

        // Delete dislike if exist.
        if (placeDislike !== null) {
            await prisma.$transaction(async (prismaTransaction) => {
                await prismaTransaction.placeDislikes.delete({
                    where: { id: placeDislike.id }
                })
                await prismaTransaction.places.update({
                    where: { id: placeId },
                    data: {
                        dislike: {
                            decrement: 1
                        }
                    }
                })
            })
            return
        }

        // Add dislike.
        await prisma.$transaction(async (prismaTransaction) => {
            await prismaTransaction.placeDislikes.create({
                data: { placeId, userId }
            })
            await prismaTransaction.places.update({
                where: { id: placeId },
                data: {
                    dislike: {
                        increment: 1
                    }
                }
            })
        })
    }

    /**
     * Increment place views count.
     */
    async incrementPlaceViewsCount (placeId: string): Promise<void> {
        // Check place data.
        const place = await prisma.places.findUnique({ where: { id: placeId } })
        if (place === null) {
            throw new NotFoundException('Data lokasi tidak ditemukan!')
        }

        // Increment views count.
        await prisma.places.update({
            where: { id: placeId },
            data: {
                views: {
                    increment: 1
                }
            }
        })
    }

    /**
     * Add place to user bookmarks.
     */
    async addPlaceToBookmarks (userId: string, placeId: string): Promise<void> {
        // Check place data.
        const place = await prisma.places.findUnique({ where: { id: placeId } })
        if (place === null) {
            throw new NotFoundException('Data lokasi tidak ditemukan!')
        }

        // Get current user bookmark.
        const placeBookmark = await prisma.placeBookmarks.findFirst({
            where: {
                AND: [
                    { placeId }, { userId }
                ]
            }
        })

        // Delete bookmark if exist.
        if (placeBookmark !== null) {
            await prisma.$transaction(async (prismaTransaction) => {
                await prismaTransaction.placeBookmarks.delete({
                    where: { id: placeBookmark.id }
                })
                await prismaTransaction.places.update({
                    where: { id: placeId },
                    data: {
                        saved: {
                            decrement: 1
                        }
                    }
                })
            })
            return
        }

        // Add bookmark.
        await prisma.$transaction(async (prismaTransaction) => {
            await prismaTransaction.placeBookmarks.create({
                data: { placeId, userId }
            })
            await prismaTransaction.places.update({
                where: { id: placeId },
                data: {
                    saved: {
                        increment: 1
                    }
                }
            })
        })
    }
}
