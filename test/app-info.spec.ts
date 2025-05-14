import * as request from 'supertest'
import { Test } from '@nestjs/testing'
import { type INestApplication, ValidationPipe } from '@nestjs/common'
import { AppModule } from '@/app.module'

describe('AppInfoModule', () => {
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

    it('(GET) Root Api', async () => {
        const response = await request(app.getHttpServer())
            .get('/')
            .expect(200)
        expect(response.body).toHaveProperty('message')
    })
})
