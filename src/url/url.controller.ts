import {
  Body,
  Controller,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CreateShortUrlDto } from './dto/create-short-url.dto';
import { CreateShortUrlResponseDto } from './dto/create-short-url-response.dto';
import { UrlService } from './url.service';

@ApiTags('url')
@Controller('shorten_url')
export class UrlController {
  constructor(
    private readonly urlService: UrlService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create or return a short URL key' })
  @ApiOkResponse({
    description: 'An existing short URL mapping was found and returned.',
    type: CreateShortUrlResponseDto,
  })
  @ApiCreatedResponse({
    description: 'A new short URL mapping was created successfully.',
    type: CreateShortUrlResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Submitted URL did not pass validation.',
  })
  create(
    @Body() createShortUrlDto: CreateShortUrlDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { key, created } = this.urlService.create(createShortUrlDto.url);

    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);

    return {
      key,
      short_url: `${this.getPublicOrigin(request)}/shorten_url/${key}`,
    };
  }

  @Get(':key')
  @Redirect(undefined, 302)
  @ApiOperation({ summary: 'Redirect to the original URL' })
  @ApiFoundResponse({
    description: 'Redirects to the stored URL.',
  })
  @ApiNotFoundResponse({
    description: 'Short key was not found.',
  })
  redirect(@Param('key') key: string) {
    const record = this.urlService.resolve(key);

    if (!record) {
      throw new NotFoundException(`Short URL key "${key}" was not found.`);
    }

    return { url: record.url };
  }

  private getPublicOrigin(request: Request) {
    const forwardedProto = request.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const forwardedHost = request.get('x-forwarded-host')?.split(',')[0]?.trim();
    const protocol = forwardedProto ?? request.protocol;
    const host =
      forwardedHost ??
      request.get('host') ??
      `localhost:${this.configService.get<string>('PORT') ?? 3001}`;

    return `${protocol}://${host}`;
  }
}
