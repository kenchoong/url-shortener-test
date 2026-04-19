import { ApiProperty } from '@nestjs/swagger';

export class CreateShortUrlResponseDto {
  @ApiProperty({
    example: 'abc123',
  })
  key!: string;

  @ApiProperty({
    example: 'http://localhost:3352/shorten_url/abc123',
  })
  short_url!: string;
}
