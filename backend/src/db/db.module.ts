import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGO_DB_URI'),
        onConnectionCreate: (connection: Connection) => {
            connection.on('connected', () => console.log('Connected to MongoDB!'));
            connection.on('error', (err) => console.error('MongoDB connection error:', err));
            connection.on('disconnected', () => console.log('Disconnected from MongoDB!'));
        }
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DbModule {}