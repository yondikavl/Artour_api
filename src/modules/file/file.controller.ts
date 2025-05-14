import * as path from 'path'
import { v4 as uuid } from 'uuid'
import { diskStorage } from 'multer'
import { BadRequestException, Controller, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileService } from './file.service'
import { FileInterceptor } from '@nestjs/platform-express'
import { type UserAuthenticated } from '@/middlewares/interfaces/AuthMiddleware'

@Controller('files')
export class FileController {
    constructor (private readonly fileService: FileService) {}

    @Post('/map-contents')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './storages/map-contents',
            filename: (req, file, callback) => {
                const timestamp = new Date().getTime()
                const ext = path.extname(file.originalname).toLowerCase()
                const filename = `map-content-${uuid()}-${timestamp}${ext}`
                callback(null, filename)
            }
        }),
        fileFilter: (req, file, callback) => {
            const allowImage = ['image/png', 'image/jpg', 'image/jpeg']
            if (!allowImage.includes(file.mimetype)) {
                callback(new BadRequestException('File extension not allowed'), false); return
            }
            callback(null, true)
        }
    }))
    async uploadTaskFile (
        @UploadedFile() file: Express.Multer.File,
        @Res({ passthrough: true }) res
    ): Promise<any> {
        const userAuthenticated: UserAuthenticated = res.locals.userAuthenticated
        if (file === undefined) throw new BadRequestException('File not uploaded!')
        const fileInfo = await this.fileService.saveFileMapContentInfo(userAuthenticated.user.id, file)
        return {
            data: fileInfo
        }
    }
}
