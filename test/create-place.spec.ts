import * as fs from 'fs'
import * as path from 'path'
import { randomInt } from 'crypto'
import * as request from 'supertest'
import { Test } from '@nestjs/testing'
import { faker } from '@faker-js/faker'
import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '@/app.module'
import prisma from '@/databases/prisma.db'

describe('CreatePlace', () => {
    let app: INestApplication

    beforeAll(async () => {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule]
        }).compile()
        app = moduleFixture.createNestApplication()
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true
            })
        )
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it('Create Dummy Places', async () => {
        // Get list place category.
        const placeCategories = await prisma.placeCategories.findMany()

        // Auth read image files in /dummy-images
        const filesInDir = fs.readdirSync(path.join(process.cwd(), 'test', 'dummy-images'))
        const imageFileNames = filesInDir.filter(item => item.includes('.jpg') || item.includes('.png') || item.includes('.jpeg'))

        // Create 50 places.
        for (let i = 0; i < 20; i++) {
            // Get admin user.
            const emails = ['fanesahadi@gmail.com', 'ilhamfirman39@gmail.com', 'firman.ashari@if.itera.ac.id']
            const useRandomEmail = faker.helpers.arrayElement(emails)
            const user = await prisma.users.findFirst({ where: { email: useRandomEmail } })

            // User login.
            const responseLogin = await request(app.getHttpServer())
                .post('/auth/login')
                .send({
                    email: user.email,
                    password: '12345678'
                })
            const accessToken = responseLogin.body.data.accessToken

            // Upload file images.
            const fileIds: string[] = []
            for (let j = 0; j < randomInt(4, 10); j++) {
                const fileIndex = randomInt(0, imageFileNames.length - 1)
                const filePath = path.join(process.cwd(), 'test', 'dummy-images', imageFileNames[fileIndex])
                const responseFile = await request(app.getHttpServer())
                    .post('/files/map-contents')
                    .set('Authorization', `Bearer ${accessToken}`)
                    .attach('file', filePath)
                console.log(responseFile.body)
                fileIds.push(responseFile.body.data.id as string)
            }

            // Create place.
            const responcePlace = await request(app.getHttpServer())
                .post('/places')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    name: faker.lorem.words(4),
                    description: faker.lorem.paragraphs(1),
                    categoryId: placeCategories[randomInt(0, placeCategories.length - 1)].id,
                    mapImageIds: fileIds,
                    mapImageCoverId: fileIds[randomInt(0, 3)],
                    latitude: faker.location.latitude({ max: -4.0, min: -5.8 }),
                    longitude: faker.location.longitude({ max: 106.0, min: 103 }),
                    address: faker.location.streetAddress(),
                    openingHours: [
                        {
                            dayIndex: 0,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        },
                        {
                            dayIndex: 1,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        },
                        {
                            dayIndex: 2,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        },
                        {
                            dayIndex: 3,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        },
                        {
                            dayIndex: 4,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        },
                        {
                            dayIndex: 5,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        },
                        {
                            dayIndex: 6,
                            closed: faker.datatype.boolean(),
                            fullOpeningHours: faker.datatype.boolean(),
                            openingHours: '00:00',
                            closingHours: '00:00'
                        }
                    ],
                    website: faker.internet.url(),
                    phone: faker.phone.number(),
                    price: faker.number.int({ min: 10_000, max: 1_000_000 }),
                    hashtags: [
                        faker.word.adverb(),
                        faker.word.adverb(),
                        faker.word.adverb()
                    ]
                })
                .expect(201)
            console.log(responcePlace.body)
            const placeId = responcePlace.body.data.id

            // Manipulate place data.
            await prisma.places.update({
                where: { id: placeId },
                data: {
                    rating: faker.number.float({ min: 0, max: 5 }),
                    views: faker.number.int({ min: 0, max: 60_000 }),
                    like: faker.number.int({ min: 0, max: 1_000 }),
                    dislike: faker.number.int({ min: 0, max: 4 }),
                    saved: faker.number.int({ min: 0, max: 1_000 })
                }
            })
        }
    }, 60_000)
})
