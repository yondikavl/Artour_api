import * as jwt from 'jsonwebtoken'
import { type Request, type Response, type NextFunction } from 'express'
import { Injectable, type NestMiddleware, UnauthorizedException } from '@nestjs/common'
import prisma from '@/databases/prisma.db'
import { UserRoleEnum } from '@prisma/client'
import { JWT_SECRET_KEY } from '@/constants/environments'
import { type UserAuthenticated } from './interfaces/AuthMiddleware'
import { type AccessTokenPayload } from '@/modules/auth/interfaces/Auth'

/**
 * Verify jwt access token.
 */
const verifyAccessToken = async (headers): Promise<AccessTokenPayload> => {
    try {
        // Get access token.
        const bearerPart: string[] = headers.authorization.split(' ')
        const accessToken = bearerPart[1]

        // Verify and decode token.
        const decodedToken = jwt.verify(accessToken, JWT_SECRET_KEY)
        if (typeof decodedToken === 'string') throw new Error()

        // Validate expired token.
        const timeNow = new Date().getTime()
        const expToken = decodedToken.exp * 1000
        if (timeNow > expToken) throw new Error()

        // Done.
        const tokenPayload: AccessTokenPayload = {
            email: decodedToken.email,
            userId: decodedToken.userId,
            sessionId: decodedToken.sessionId
        }
        return tokenPayload
    } catch (error) {
        throw new UnauthorizedException('Unauthorized access!')
    }
}

/**
 * Middleware for user role.
 */
@Injectable()
export class UserLoggedMiddleware implements NestMiddleware {
    async use (req: Request, res: Response, next: NextFunction): Promise<void> {
        // Get token payload.
        const tokenPayload = await verifyAccessToken(req.headers)

        try {
            // Get user and validate it.
            const user = await prisma.users.findUnique({ where: { id: tokenPayload.userId } })
            if (user === null || !user.active) throw new Error('')

            // Get session and validate it.
            const session = await prisma.sessions.findUnique({ where: { id: tokenPayload.sessionId } })
            if (session === null || session.signoutAt !== null) throw new Error('')

            // Register to next request.
            const { password, ...userNoPassword } = user
            const userAuthenticated: UserAuthenticated = {
                user: userNoPassword,
                tokenPayload
            }
            res.locals.userAuthenticated = userAuthenticated
            next()
        } catch (error) {
            throw new UnauthorizedException('Unauthorized access!')
        }
    }
}

/**
 * Middleware for admin role.
 */
@Injectable()
export class UserAdminLoggedMiddleware implements NestMiddleware {
    async use (req: Request, res: Response, next: NextFunction): Promise<void> {
        // Get token payload.
        const tokenPayload = await verifyAccessToken(req.headers)

        try {
            // Get user and validate it.
            const user = await prisma.users.findUnique({ where: { id: tokenPayload.userId } })
            if (user === null || !user.active) throw new Error('')

            // Validate user role.
            if (user.role !== UserRoleEnum.ADMIN) throw new Error('')

            // Get session and validate it.
            const session = await prisma.sessions.findUnique({ where: { id: tokenPayload.sessionId } })
            if (session === null || session.signoutAt !== null) throw new Error('')

            // Register to next request.
            const { password, ...userNoPassword } = user
            const userAuthenticated: UserAuthenticated = {
                user: userNoPassword,
                tokenPayload
            }
            res.locals.userAuthenticated = userAuthenticated
            next()
        } catch (error) {
            throw new UnauthorizedException('Unauthorized access!')
        }
    }
}
