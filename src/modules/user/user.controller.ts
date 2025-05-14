import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { diskStorage } from 'multer'
import { FileInterceptor } from '@nestjs/platform-express'
import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import prisma from '@/databases/prisma.db'
import { UserService } from './user.service'
import { ChangeInfoDto } from './dto/change-info.dto'
import { ChangeUserRoleDto } from './dto/change-role.dto'
import { type UserAuthenticated } from '@/middlewares/interfaces/AuthMiddleware'

@Controller('users')
export class UserController {
    constructor (private readonly userService: UserService) {}

    @Get()
    async getUsers (
        @Query('filter') filter: string | undefined,
        @Query('limit') limit: string | undefined,
        @Query('keyword') keyword: string | undefined
    ): Promise<any> {
        const users = await this.userService.getUsers(filter, limit, keyword)
        return {
            data: users,
            meta: {
                total: await prisma.users.count(),
                limit: limit ? (parseInt(limit) || 500) : undefined
            }
        }
    }

    @Post('/avatars')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './storages/avatars',
            filename: (req, file, callback) => {
                const timestamp = new Date().getTime()
                const ext = path.extname(file.originalname)
                const filename = `avatar-${uuid()}-${timestamp}${ext}`
                callback(null, filename)
            }
        }),
        fileFilter: (req, file, callback) => {
            const allowImage = ['image/png', 'image/jpg', 'image/jpeg']
            if (!allowImage.includes(file.mimetype)) {
                callback(new BadRequestException('File extension tidak diizinkan.'), false); return
            }
            callback(null, true)
        }
    }))
    async uploadTaskFile (@UploadedFile() file: Express.Multer.File, @Res({ passthrough: true }) res): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        if (file === undefined) throw new BadRequestException('File not uploaded!')
        await this.userService.updateUserAvatar(userAuthenticated.user.id, file)
        return {
            message: 'ok'
        }
    }

    @Patch('info')
    async changeMyInfo (@Res({ passthrough: true }) res, @Body() dto: ChangeInfoDto): Promise<any> {
        const { user }: UserAuthenticated = res.locals.userAuthenticated
        await this.userService.changeUserInfo(user.id, dto)
        return {
            message: 'ok'
        }
    }

    @Patch('role')
    async changeUserRole (
            @Query('userId') userId: string,
            @Res({ passthrough: true }) res,
            @Body() dto: ChangeUserRoleDto
    ): Promise<any> {
        if (!userId) throw new BadRequestException('Parameter userId is required!')
        const { user }: UserAuthenticated = res.locals.userAuthenticated
        await this.userService.changeUserRole(userId, user.id, dto)
        return {
            message: 'ok'
        }
    }

    @Delete(':userId')
    async deleteUser (
        @Res({ passthrough: true }) res,
        @Param('userId') userId: string
    ): Promise<any> {
        const { user }: UserAuthenticated = res.locals.userAuthenticated
        await this.userService.deleteUser(userId, user.id)
        return {
            message: 'ok'
        }
    }
}
