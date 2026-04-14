import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { GlobalExceptionFilter } from './common/filters/global-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Allow the Next.js frontend to call this API during development.
  // In production this would be locked down to the actual frontend domain.
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  })

  // Global validation pipe — applies to every route in the app.
  // whitelist: strips fields not in the DTO so unexpected data never reaches services.
  // transform: automatically converts incoming JSON to the DTO class instances,
  //   which is required for class-validator to work on nested objects.
  // forbidNonWhitelisted would throw on extra fields — we use whitelist instead
  //   which silently strips them, friendlier for clients sending extra context.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )

  // Global exception filter — wraps every error into consistent JSON shape.
  // Applied here at the app level so it catches everything.
  app.useGlobalFilters(new GlobalExceptionFilter())

  const port = process.env.PORT ?? 3001
  await app.listen(port)

  console.log(`API running on http://localhost:${port}`)
}

bootstrap()