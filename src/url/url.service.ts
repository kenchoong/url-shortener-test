import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class UrlService {
  constructor(private readonly storageService: StorageService) {}

  create(url: string) {
    const existingKey = this.storageService.getKeyByUrl(url);

    if (existingKey) {
      return { key: existingKey, created: false };
    }

    let key = this.generateKey();

    while (this.storageService.has(key)) {
      key = this.generateKey();
    }

    this.storageService.set(key, {
      url,
      createdAt: new Date().toISOString(),
      visits: 0,
    });

    return { key, created: true };
  }

  resolve(key: string) {
    return this.storageService.incrementVisits(key);
  }

  private generateKey() {
    return randomBytes(3).toString('hex');
  }
}
