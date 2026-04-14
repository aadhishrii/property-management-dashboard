import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from './prisma/prisma.module'
import { PropertiesModule } from './properties/properties.module'
import { BuildingsModule } from './buildings/buildings.module'
import { UnitsModule } from './units/units.module'
import { StaffModule } from './staff/staff.module'
import { UploadModule } from './upload/upload.module'

@Module({
  imports: [
    // ConfigModule.forRoot() loads the .env file and makes process.env
    // available throughout the app. isGlobal means we don't need to
    // import it in every individual module.
    ConfigModule.forRoot({ isGlobal: true }),

    // PrismaModule is @Global so it doesn't need importing in each module —
    // but it must be imported here at the root so NestJS bootstraps it.
    PrismaModule,

    // Feature modules — each encapsulates its own controller, service, and DTO
    PropertiesModule,
    BuildingsModule,
    UnitsModule,
    StaffModule,
    UploadModule,
  ],
})
export class AppModule {}