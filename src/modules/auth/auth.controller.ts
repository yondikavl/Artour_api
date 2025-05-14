import { Request } from 'express'
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Query, Req, Res } from '@nestjs/common'
import { GoogleAuthForm } from './auth.enum'
import { AuthService } from './auth.service'
import { UserLoginDto } from './dto/user-login.dto'
import { APP_WEB_BASE_URL } from '@/constants/environments'
import { type UserAuthenticated } from '@/middlewares/interfaces/AuthMiddleware'

@Controller('auth')
export class AuthController {
    constructor (private readonly authService: AuthService) {}

    @Post('login')
    @HttpCode(200)
    async login (@Body() dto: UserLoginDto, @Req() req: Request): Promise<any> {
        const accessToken = await this.authService.userLogin(dto, req)
        return {
            message: 'Login success!',
            data: {
                email: dto.email,
                accessToken
            }
        }
    }

    @Get('google')
    @HttpCode(200)
    async oAuth2Google (@Res() res): Promise<any> {
        const googleAuthUrl = this.authService.generateGoogleAuthUrl()
        res.redirect(googleAuthUrl) // Redirect to "/auth/google/web-callback?code=xxx"
    }

    @Get('google/callback')
    @HttpCode(200)
    async oAuth2GoogleCallback (
        @Req() req: Request,
        @Query('code') code: string | null,
        @Res() res
    ): Promise<any> {
        const loginPageUrl = `${APP_WEB_BASE_URL}/#/auth` // For GoogleAuthForm.WEB

        // Validate request data.
        if (code === null) {
            res.redirect(`${loginPageUrl}?error=auth_failed`)
            return
        }

        // Get access token.
        try {
            const googleAuthPayload = await this.authService.getOAuthGoogleUserPayload(code, GoogleAuthForm.WEB)
            const accessToken = await this.authService.authWithOAuth2GoogleUserPayload(googleAuthPayload, req)
            res.redirect(`${loginPageUrl}?accessToken=${accessToken}`)
        } catch (error) {
            console.error(error)
            res.redirect(`${loginPageUrl}?error=auth_failed`)
        }
    }

    @Get('google/mobile-callback')
    @HttpCode(200)
    async oAuth2GoogleMobileCallback (
        @Req() req: Request,
        @Query('code') code: string | null
    ): Promise<any> {
        // Validate token code.
        if (code === null) throw new BadRequestException('Failed to login. Need auth token.')

        // Get access token.
        try {
            const googleAuthPayload = await this.authService.getOAuthGoogleUserPayload(code, GoogleAuthForm.MOBILE)
            const authToken = await this.authService.authWithOAuth2GoogleUserPayload(googleAuthPayload, req)
            return {
                data: {
                    authToken
                }
            }
        } catch (error) {
            console.log(error)
            throw new BadRequestException('Failed to login with mobile Google. Please try again.')
        }
    }

    @Get('my-session')
    async mySessionInfo (@Res({ passthrough: true }) res): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        const user = await this.authService.getUserInfoBySessionId(userAuthenticated.tokenPayload.sessionId)
        return {
            data: user
        }
    }

    @Delete('logout')
    async logout (@Res({ passthrough: true }) res): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        await this.authService.userLogout(userAuthenticated.tokenPayload.sessionId)
        return {
            message: 'Logout success!'
        }
    }
}
