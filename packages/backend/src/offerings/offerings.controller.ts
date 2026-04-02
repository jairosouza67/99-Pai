import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OfferingsService } from './offerings.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { OfferingResponseDto } from './dto/offering-response.dto';
import { OfferingContactResponseDto } from './dto/offering-contact-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '../common/enums/role.enum';

@ApiTags('Offerings')
@Controller('offerings')
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.provider, Role.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new offering (provider or admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Offering created successfully',
    type: OfferingResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - requires provider role',
  })
  @ApiResponse({
    status: 404,
    description: 'Category or subcategory not found',
  })
  async create(
    @User() user: { userId: string },
    @Body() createOfferingDto: CreateOfferingDto,
  ) {
    return this.offeringsService.create(user.userId, createOfferingDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all active offerings (public)' })
  @ApiResponse({
    status: 200,
    description: 'List of active offerings',
    type: [OfferingResponseDto],
  })
  async findAll() {
    return this.offeringsService.findAll();
  }

  // Static routes MUST come BEFORE dynamic parameter routes
  @Get('category/:categoryId')
  @ApiOperation({ summary: 'List offerings by category (public)' })
  @ApiParam({ name: 'categoryId', description: 'Category UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of offerings in category',
    type: [OfferingResponseDto],
  })
  async findByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.offeringsService.findByCategory(categoryId);
  }

  @Get('subcategory/:subcategoryId')
  @ApiOperation({ summary: 'List offerings by subcategory (public)' })
  @ApiParam({ name: 'subcategoryId', description: 'Subcategory UUID' })
  @ApiResponse({
    status: 200,
    description: 'List of offerings in subcategory',
    type: [OfferingResponseDto],
  })
  async findBySubcategory(
    @Param('subcategoryId', ParseUUIDPipe) subcategoryId: string,
  ) {
    return this.offeringsService.findBySubcategory(subcategoryId);
  }

  // Dynamic parameter route comes AFTER static routes
  @Get(':id')
  @ApiOperation({ summary: 'Get offering details (public)' })
  @ApiParam({ name: 'id', description: 'Offering UUID' })
  @ApiResponse({
    status: 200,
    description: 'Offering details',
    type: OfferingResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an offering (owner only)' })
  @ApiParam({ name: 'id', description: 'Offering UUID' })
  @ApiResponse({
    status: 200,
    description: 'Offering updated',
    type: OfferingResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: { userId: string },
    @Body() updateOfferingDto: UpdateOfferingDto,
  ) {
    return this.offeringsService.update(id, user.userId, updateOfferingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate an offering (owner only)' })
  @ApiParam({ name: 'id', description: 'Offering UUID' })
  @ApiResponse({ status: 200, description: 'Offering deactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the owner' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: { userId: string },
  ) {
    return this.offeringsService.deactivate(id, user.userId);
  }

  @Post(':id/contact-data')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Request contact information for an offering' })
  @ApiParam({ name: 'id', description: 'Offering UUID' })
  @ApiResponse({
    status: 201,
    description: 'Contact information retrieved',
    type: OfferingContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot request contact for own offering',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Offering not found' })
  async requestContact(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: { userId: string },
  ) {
    return this.offeringsService.requestContact(id, user.userId);
  }
}
