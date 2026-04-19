import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageModule } from './storage/storage.module';
import { UrlModule } from './url/url.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), StorageModule, UrlModule],
})
export class AppModule {}
