import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Post('reviews')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Crear o actualizar mi reseña de un vino' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateReviewDto) {
    return this.service.createOrUpdate(user.userId, dto);
  }

  @Get('wines/:wineId/reviews')
  @ApiOperation({ summary: 'Reseñas de un vino (paginadas) + promedio' })
  list(@Param('wineId') wineId: string, @Query('page') page?: string) {
    return this.service.listForWine(wineId, Number(page) || 1, 10);
  }
}
