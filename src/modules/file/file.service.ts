import * as fs from 'fs'
import { Injectable } from '@nestjs/common'
import { BASE_URL_MAP_CONTENTS } from '@/constants/file-path'
import prisma from '@/databases/prisma.db'
import { type FileEntity } from '@/entities/file.entity'
import { FileTypeEnum } from '@prisma/client'
import { APP_ROOT_PATH } from '@/constants/environments'

@Injectable()
export class FileService {
    /**
     * Save file map content info to database.
     */
    async saveFileMapContentInfo (userId: string, file: Express.Multer.File): Promise<FileEntity> {
        // save file info to database.
        const fileUploaded: FileEntity = await prisma.files.create({
            data: {
                userId,
                type: FileTypeEnum.IMAGE_MAP,
                originalName: file.originalname,
                filename: file.filename,
                size: file.size.toString(),
                mimetype: file.mimetype,
                used: false
            }
        })

        // Done.
        return this.generateMapImageUrl(fileUploaded)
    }

    /**
     * Delete unused user files.
     */
    async deleteUnusedUserFiles (userId?: string): Promise<void> {
        // Delete unused files in storage.
        const files = await prisma.files.findMany({
            where: {
                userId,
                used: false
            }
        })
        for (const file of files) {
            const filePath = `${APP_ROOT_PATH}/storages/map-contents/${file.filename}`
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
            await prisma.files.delete({ where: { id: file.id } })
        }
    }

    /**
     * Generate map image url.
     */
    generateMapImageUrl (file: FileEntity): FileEntity {
        file.link = `${BASE_URL_MAP_CONTENTS}${file.filename}`
        return file
    }
}
