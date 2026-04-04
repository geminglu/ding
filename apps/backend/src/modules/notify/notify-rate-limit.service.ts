import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface RateBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class NotifyRateLimitService {
  private readonly buckets = new Map<string, RateBucket>();

  constructor(private readonly configService: ConfigService) {}

  assertCanSend(key: string, ip: string) {
    this.consume(
      `key:${key}`,
      this.configService.getOrThrow<number>("config.rateLimitPerKeyPerMinute"),
      "当前 key 请求过于频繁，请稍后再试",
    );
    this.consume(
      `ip:${ip || "unknown"}`,
      this.configService.getOrThrow<number>("config.rateLimitPerIpPerMinute"),
      "当前 IP 请求过于频繁，请稍后再试",
    );
  }

  private consume(bucketKey: string, limit: number, message: string) {
    const now = Date.now();
    const current = this.buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, {
        count: 1,
        resetAt: now + 60_000,
      });
      this.compact(now);
      return;
    }

    if (current.count >= limit) {
      throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
    }

    current.count += 1;
  }

  private compact(now: number) {
    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
