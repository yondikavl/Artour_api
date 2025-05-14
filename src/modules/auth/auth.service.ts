import { compare } from 'bcryptjs'
import * as jwt from 'jsonwebtoken'
import { type Request } from 'express'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import prisma from '@/databases/prisma.db'
import { GoogleAuthForm } from './auth.enum'
import { UserService } from '../user/user.service'
import { type UserEntity } from '@/entities/user.entity'
import { type UserLoginDto } from './dto/user-login.dto'
import { oauth2 } from 'googleapis/build/src/apis/oauth2'
import { GOOGLE_AUTH_SCOPES, oAuth2Client } from '@/helpers/google-auth.helper'
import { type GoogleAuthUserPayload, type AccessTokenPayload } from './interfaces/Auth'
import { GOOGLE_AUTH_CLIENT_ID, JWT_SECRET_KEY, SUPER_ADMIN_MAILS } from '@/constants/environments'

@Injectable()
export class AuthService {
    constructor (
        private readonly userService: UserService
    ) {}

    /**
     * Manual login user.
     */
    async userLogin (dto: UserLoginDto, req: Request): Promise<string> {
        const message = 'Email atau password salah.'

        // Find user by email and validate email.
        const user = await prisma.users.findUnique({
            where: { email: dto.email }
        })
        if (user === null) throw new UnauthorizedException(message)

        // Validate password.
        if (!await compare(dto.password, user.password)) {
            throw new UnauthorizedException(message)
        }

        // Validate active account.
        if (!user.active) {
            throw new UnauthorizedException('Periksa inbox email untuk mengaktifkan akun!')
        }

        // Start login transaction.
        let accessToken: string
        await prisma.$transaction(async (prismaTransaction) => {
            // Insert session login.
            const userIpAddress = req.ip
            const userAgent = req.headers['user-agent'] ?? '-'
            const session = await prismaTransaction.sessions.create({
                data: {
                    userId: user.id,
                    ipAddress: userIpAddress,
                    userAgent
                }
            })

            // Generate access token.
            const tokenPayload: AccessTokenPayload = {
                sessionId: session.id,
                email: user.email,
                userId: user.id
            }
            accessToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, { expiresIn: '60d' })

            // Update user last login.
            await prismaTransaction.users.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            })
        })

        // Done.
        return accessToken
    }

    /**
     * generate google auth url for browser action.
     */
    generateGoogleAuthUrl (): string {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: GOOGLE_AUTH_SCOPES,
            include_granted_scopes: true
        })
        return authUrl
    }

    /**
     * Get user dara from code google auth.
     */
    async getOAuthGoogleUserPayload (code: string, authFrom: GoogleAuthForm): Promise<GoogleAuthUserPayload> {
        const userPayload: GoogleAuthUserPayload = {
            name: '',
            email: '',
            avatar: ''
        }

        // Get user data auth from WEB.
        if (authFrom === GoogleAuthForm.WEB) {
            const authToken = await oAuth2Client.getToken(code)
            oAuth2Client.setCredentials(authToken.tokens)
            const oAuth2 = oauth2({
                auth: oAuth2Client,
                version: 'v2'
            })
            const userInfo = await oAuth2.userinfo.get()
            const { email, name, picture } = userInfo.data
            userPayload.name = name
            userPayload.email = email
            userPayload.avatar = picture
        } else if (authFrom === GoogleAuthForm.MOBILE) {
            const userInfo = await oAuth2Client.verifyIdToken({
                idToken: code,
                audience: GOOGLE_AUTH_CLIENT_ID
            })
            const { email, name, picture } = userInfo.getPayload()
            userPayload.name = name
            userPayload.email = email
            userPayload.avatar = picture
        }

        // Validate payload filds.
        if (userPayload.name.trim() === '' || userPayload.email.trim() === '') {
            throw new UnauthorizedException('Failed to auth. Please try again.')
        }

        // Done.
        return userPayload
    }

    /**
     * Auth with google user payload.
     */
    async authWithOAuth2GoogleUserPayload (userPayload: GoogleAuthUserPayload, req: Request): Promise<string | null> {
        // Check user in db.
        let user: UserEntity = await prisma.users.findUnique({
            where: { email: userPayload.email }
        })

        // Create user is not exits.
        if (user === null) {
            user = await this.userService.createUserFromAuthGoogle(userPayload)
        }

        // Insert session login.
        const userIpAddress = req.ip
        const userAgent = req.headers['user-agent']
        const session = await prisma.sessions.create({
            data: {
                userId: user.id,
                ipAddress: userIpAddress,
                userAgent
            }
        })

        // Generate access token.
        const tokenPayload: AccessTokenPayload = {
            sessionId: session.id,
            userId: user.id,
            email: user.email
        }
        const accessToken = jwt.sign(tokenPayload, JWT_SECRET_KEY, { expiresIn: '30d' })

        // Done.
        return accessToken
    }

    /**
     * Get user info by active session.
     */
    async getUserInfoBySessionId (sessionId: string): Promise<UserEntity> {
        // Get user data.
        const session = await prisma.sessions.findUnique({ where: { id: sessionId } })
        const { password, ...user } = await this.userService.getById(session.userId)

        // Get user meta.
        const reviewCount = await prisma.placeReviews.count({ where: { userId: user.id } })
        user.userMeta = {
            reviews: reviewCount,
            isSuperAdmin: SUPER_ADMIN_MAILS.includes(user.email)
        }

        // Done.
        return user
    }

    /**
     * User logout.
     */
    async userLogout (sessionId: string): Promise<void> {
        // Set session signout.
        await prisma.sessions.update({
            where: { id: sessionId },
            data: {
                signoutAt: new Date()
            }
        })
    }
}
