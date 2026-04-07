import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { ElderlyModule } from './elderly/elderly.module';
import { CaregiverModule } from './caregiver/caregiver.module';
import { MedicationsModule } from './medications/medications.module';
import { ContactsModule } from './contacts/contacts.module';
import { AgendaModule } from './agenda/agenda.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InteractionsModule } from './interactions/interactions.module';
import { WeatherModule } from './weather/weather.module';
import { CategoriesModule } from './categories/categories.module';
import { OfferingsModule } from './offerings/offerings.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { HealthModule } from './health/health.module';
import { VoiceModule } from './voice/voice.module';

@Module({
  imports: [
    ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: join(__dirname, '../../../.env'),
        }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    SupabaseModule,
    AuthModule,
    ElderlyModule,
    CaregiverModule,
    MedicationsModule,
    ContactsModule,
    AgendaModule,
    NotificationsModule,
    InteractionsModule,
    WeatherModule,
    CategoriesModule,
    OfferingsModule,
    ServiceRequestsModule,
    HealthModule,
    VoiceModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule {}
