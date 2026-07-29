import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { ListWinesQueryDto } from './dto/list-wines-query.dto';

@ApiTags('catalog')
@Controller('wines')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @ApiOperation({ summary: 'Catálogo paginado de vinos (filtros, orden, agregado de reseñas)' })
  list(@Query() query: ListWinesQueryDto) {
    return this.catalogService.listWines(query);
  }

  @Get('facets')
  @ApiOperation({ summary: 'Conteos por tipo, país y cepa para filtros' })
  facets() {
    return this.catalogService.facets();
  }

  @Get('bestsellers')
  @ApiOperation({ summary: 'Top de vinos por puntaje de crítica' })
  bestsellers() {
    return this.catalogService.bestsellers(10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ficha de un vino con precios por tienda y referencias' })
  get(@Param('id') id: string) {
    return this.catalogService.getWine(id);
  }
}
