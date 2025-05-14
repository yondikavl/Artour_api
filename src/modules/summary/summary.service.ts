import prisma from '@/databases/prisma.db'
import { Injectable } from '@nestjs/common'
import { type DataOverview } from './interfaces/Summary'

@Injectable()
export class SummaryService {
    /**
     * Get data overview.
     */
    async getDataOverview (): Promise<DataOverview> {
        const dataOverview: DataOverview = {
            totalUser: await prisma.users.count(),
            totalPlace: await prisma.places.count(),
            totalReview: await prisma.placeReviews.count()
        }
        return dataOverview
    }
}
