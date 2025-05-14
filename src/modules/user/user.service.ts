import * as fs from 'fs'
import { hash } from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import * as randomString from 'randomstring'
import axios, { type AxiosResponse } from 'axios'
import { type Prisma, type PrismaClient, UserRoleEnum } from '@prisma/client'
import { BASE_URL_AVATARS, PATH_NO_PICTURE } from '@/constants/file-path'
import { SUPER_ADMIN_MAILS, APP_API_BASE_URL, APP_ROOT_PATH } from '@/constants/environments'
import prisma from '@/databases/prisma.db'
import { type UserEntity } from '@/entities/user.entity'
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { type GoogleAuthUserPayload } from '../auth/interfaces/Auth'
import { type ChangeInfoDto } from './dto/change-info.dto'
import { FileService } from '../file/file.service'
import { PlaceReviewService } from '../place-review/place-review.service'
import { PlaceService } from '../place/place.service'
import { type ChangeUserRoleDto } from './dto/change-role.dto'

@Injectable()
export class UserService {
    constructor (
        private readonly fileService: FileService,
        private readonly placeService: PlaceService,
        private readonly placeReviewService: PlaceReviewService
    ) {}

    /**
     * Get list data user.
     */
    async getUsers (
        filter: string | undefined,
        limit: string | undefined,
        keyword: string | undefined
    ): Promise<UserEntity[]> {
        // Build filter query.
        const whereInput: Prisma.UsersWhereInput = {
            active: true
        }
        if (keyword) {
            whereInput.OR = [
                { name: { contains: keyword } },
                { email: { contains: keyword } }
            ]
        }
        if (filter) {
            if (filter === 'role:user') {
                whereInput.role = UserRoleEnum.USER
            } else if (filter === 'role:admin') {
                whereInput.role = UserRoleEnum.ADMIN
                whereInput.email = {
                    notIn: SUPER_ADMIN_MAILS
                }
            } else if (filter === 'role:super_admin') {
                whereInput.email = {
                    in: SUPER_ADMIN_MAILS
                }
            }
        }

        // Get user data.
        const users: UserEntity[] = await prisma.users.findMany({
            where: whereInput,
            orderBy: [
                { updatedAt: 'desc' }
            ],
            take: limit ? (parseInt(limit) || 500) : undefined
        })

        // Get contribution sumarry.
        for (const user of users) {
            const placeTotal = await prisma.places.count({ where: { userId: user.id } })
            const reviewTotal = await prisma.placeReviews.count({ where: { userId: user.id } })
            user.contributionSummary = {
                placeTotal,
                reviewTotal
            }
        }

        // Rebuild user data.
        for (const user of users) {
            // Build avatar link.
            const defaultUserAvatarLink = `${APP_API_BASE_URL}${PATH_NO_PICTURE}`
            if (user.avatar === null) user.avatar = defaultUserAvatarLink
            else user.avatar = `${BASE_URL_AVATARS}${user.avatar}`

            // Get user meta.
            user.userMeta = {
                isSuperAdmin: SUPER_ADMIN_MAILS.includes(user.email)
            }

            // Remove restricted data.
            delete user.password
        }

        // Done.
        return users
    }

    /**
     * Get user data by id.
     */
    async getById (userId: string, validate: boolean = true): Promise<UserEntity> {
        // Get user data and validate it.
        const user = await prisma.users.findUnique({ where: { id: userId } })
        if (user === null && validate) throw new NotFoundException('User not found!')

        // Build and validate avatar path.
        const defaultUserAvatarLink = `${APP_API_BASE_URL}${PATH_NO_PICTURE}`
        if (user.avatar === null) user.avatar = defaultUserAvatarLink
        else user.avatar = `${BASE_URL_AVATARS}${user.avatar}`

        // Done.
        return user
    }

    /**
     * Create user from auth google payload.
     */
    async createUserFromAuthGoogle (googleAuthPayload: GoogleAuthUserPayload): Promise<UserEntity> {
        // Create random password.
        const password = randomString.generate(255)

        // Generate user role.
        let userRole: UserRoleEnum = UserRoleEnum.USER
        if (SUPER_ADMIN_MAILS.includes(googleAuthPayload.email)) {
            userRole = UserRoleEnum.ADMIN
        }

        // Download and save avatar to storage.
        const timestamp = new Date().getTime()
        const filename = `avatar-${uuid()}-${timestamp}.png`
        const fullPath = `${APP_ROOT_PATH}/storages/avatars/${filename}`
        try {
            const response: AxiosResponse = await axios({
                url: googleAuthPayload.avatar,
                method: 'GET',
                responseType: 'stream'
            })
            const writer = fs.createWriteStream(fullPath)
            response.data.pipe(writer)
            googleAuthPayload.avatar = filename
        } catch (error) {
            googleAuthPayload.avatar = null
        }

        // Create user data.
        const passwordHash = await hash(password, 10)
        const user = await prisma.users.create({
            data: {
                avatar: googleAuthPayload.avatar,
                role: userRole,
                name: googleAuthPayload.name,
                email: googleAuthPayload.email,
                password: passwordHash,
                active: true
            }
        })

        // Done.
        return user
    }

    /**
     * Update user avatar
     */
    async updateUserAvatar (userId: string, file: Express.Multer.File): Promise<void> {
        // Filter file size max 1MB.
        if (file.size > 1024 * 1024) {
            const fullPath = `${APP_ROOT_PATH}/storages/avatars/${file.filename}`
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath)
            }
            throw new BadRequestException('Maksimal ukuran file adalah 1MB')
        }

        // Remove ole avatar.
        const user = await prisma.users.findUnique({ where: { id: userId } })
        if (user.avatar !== null) {
            const fullPath = `${APP_ROOT_PATH}/storages/avatars/${user.avatar}`
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath)
            }
        }

        // Update new avatar.
        await prisma.users.update({
            where: { id: userId },
            data: { avatar: file.filename }
        })
    }

    /**
     * Change user info data.
     */
    async changeUserInfo (userId: string, dto: ChangeInfoDto): Promise<void> {
        await prisma.users.update({
            where: { id: userId },
            data: {
                name: dto.name
            }
        })
    }

    /**
     * Change user role data.
     */
    async changeUserRole (userId: string, myUserId: string, dto: ChangeUserRoleDto): Promise<void> {
        const user = await this.getById(userId, true)
        if (user === null) throw new NotFoundException('User tidak ditemukan!')

        // Can't change super admin role.
        if (SUPER_ADMIN_MAILS.includes(user.email)) {
            throw new BadRequestException('Tidak dapat mengubah role super admin!')
        }

        // Only super admin can change other user role.
        const myUserInfo = await this.getById(myUserId, true)
        if (!SUPER_ADMIN_MAILS.includes(myUserInfo.email)) {
            throw new ForbiddenException('Hanya super admin yang dapat mengubah role user lain!')
        }

        // Update role.
        await prisma.users.update({
            where: { id: userId },
            data: {
                role: dto.role
            }
        })
    }

    /**
     * Delete user data.
     */
    async deleteUser (userId: string, myUserId: string): Promise<void> {
        // Get user data.
        const user = await this.getById(userId, true)

        // Can't delete yourself.
        if (user.id === myUserId) {
            throw new BadRequestException('Tidak dapat menghapus akun sendiri!')
        }

        // Can't delete super admin.
        if (SUPER_ADMIN_MAILS.includes(user.email)) {
            throw new BadRequestException('Tidak dapat menghapus akun super admin!')
        }

        // Only super admin can delete other user.
        const myUserInfo = await this.getById(myUserId, true)
        if (!SUPER_ADMIN_MAILS.includes(myUserInfo.email)) {
            throw new ForbiddenException('Hanya super admin yang dapat menghapus akun lain!')
        }

        // Remove user places.
        const places = await prisma.places.findMany({ where: { userId: user.id } })
        for (const place of places) {
            await this.placeService.deleteUserPlace(place.userId, place.id)
        }

        // Delete user place bookmark.
        const placeBookmarks = await prisma.placeBookmarks.findMany({ where: { userId: user.id } })
        for (const placeBookmark of placeBookmarks) {
            await prisma.$transaction(async (prismaTransaction) => {
                // Delete place bookmark.
                await prismaTransaction.placeBookmarks.delete({ where: { id: placeBookmark.id } })

                // Decrement place saved.
                await prismaTransaction.places.update({
                    where: { id: placeBookmark.placeId },
                    data: {
                        saved: {
                            decrement: 1
                        }
                    }
                })
            })
        }

        // Delete user place dislike.
        const placeDislikes = await prisma.placeDislikes.findMany({ where: { userId: user.id } })
        for (const placeDislike of placeDislikes) {
            await prisma.$transaction(async (prismaTransaction) => {
                // Delete place dislike.
                await prismaTransaction.placeDislikes.delete({ where: { id: placeDislike.id } })

                // Decrement place dislike.
                await prismaTransaction.places.update({
                    where: { id: placeDislike.placeId },
                    data: {
                        dislike: {
                            decrement: 1
                        }
                    }
                })
            })
        }

        // Delete user place like.
        const placeLikes = await prisma.placeLikes.findMany({ where: { userId: user.id } })
        for (const placeLike of placeLikes) {
            await prisma.$transaction(async (prismaTransaction) => {
                // Delete place like.
                await prismaTransaction.placeLikes.delete({ where: { id: placeLike.id } })

                // Decrement place like.
                await prismaTransaction.places.update({
                    where: { id: placeLike.placeId },
                    data: {
                        like: {
                            decrement: 1
                        }
                    }
                })
            })
        }

        // Delete user place reviews.
        const placeReviews = await prisma.placeReviews.findMany({ where: { userId: user.id } })
        for (const placeReview of placeReviews) {
            await prisma.$transaction(async (prismaTransaction: PrismaClient) => {
                // Unused image review files.
                await prismaTransaction.files.updateMany({
                    where: {
                        id: {
                            in: placeReview.imageIds as string[]
                        }
                    },
                    data: { used: false }
                })

                // Delete place review.
                await prismaTransaction.placeReviews.delete({ where: { id: placeReview.id } })

                // Update reting in place.
                await this.placeReviewService.updatePlaceRating(placeReview.placeId, prismaTransaction)
            })
        }

        // Delete all user files.
        await prisma.files.updateMany({
            where: { userId: user.id },
            data: { used: false }
        })
        await this.fileService.deleteUnusedUserFiles()

        // Remove avatar file.
        if (user.avatar !== null) {
            const fullPath = `${APP_ROOT_PATH}/storages/avatars/${user.avatar}`
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath)
            }
        }

        // Remove user data.
        await prisma.users.delete({ where: { id: userId } })
    }
}
