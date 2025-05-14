import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from '@/app.module'
import prisma from '@/databases/prisma.db'
import { APP_FREEZE, APP_PORT } from '@/constants/environments'

async function bootstrap (): Promise<void> {
    // Freeze mode.
    if (APP_FREEZE) {
        console.log('App in freeze mode...')
        setInterval(() => {}, 5_000)
        return
    }

    // Connect to database services.
    try {
        await prisma.$connect()
    } catch (error) {
        console.log("Can't connect to main database. Maybe the database service is being loaded.")
        process.exit()
    }

    // Create nest app.
    const app = await NestFactory.create(AppModule)

    // Setup validator.
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true
        })
    )

    // Set cors config.
    app.enableCors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        preflightContinue: false,
        credentials: true
    })

    // Start HTTP server.
    await app.listen(APP_PORT)
}

// Entry point.
bootstrap().catch(console.error)
