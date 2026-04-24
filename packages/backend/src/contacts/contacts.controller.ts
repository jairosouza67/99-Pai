import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../common/decorators/user.decorator';
import { Role } from '../common/enums/role.enum';
import type { RequestUser } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Contacts')
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('elderly/:elderlyProfileId/contacts')
  @ApiOperation({ summary: 'Get all contacts for an elderly user' })
  @ApiResponse({ status: 200, description: 'List of contacts' })
  async getContacts(
    @User() user: RequestUser,
    @Param('elderlyProfileId') elderlyProfileId: string,
  ) {
    return this.contactsService.getContacts(user.userId, elderlyProfileId);
  }

  @Post('elderly/:elderlyProfileId/contacts')
  @ApiOperation({ summary: 'Create a new contact (caregiver only)' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  async createContact(
    @User() user: RequestUser,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Body() createDto: CreateContactDto,
  ) {
    return this.contactsService.createContact(
      user.userId,
      elderlyProfileId,
      createDto,
    );
  }

  @Patch('elderly/:elderlyProfileId/contacts/:id')
  @ApiOperation({ summary: 'Update a contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  async updateContact(
    @User() user: RequestUser,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(
      user.userId,
      elderlyProfileId,
      id,
      updateDto,
    );
  }

  @Delete('elderly/:elderlyProfileId/contacts/:id')
  @ApiOperation({ summary: 'Delete a contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted' })
  async deleteContact(
    @User() user: RequestUser,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.deleteContact(
      user.userId,
      elderlyProfileId,
      id,
    );
  }

  @Get('contacts')
  @Roles(Role.elderly)
  @ApiOperation({
    summary: 'Get contacts for elderly user with overdue status',
  })
  @ApiResponse({ status: 200, description: 'List of contacts with status' })
  async getContactsForElderly(@User() user: RequestUser) {
    return this.contactsService.getContactsForElderly(user.userId);
  }

  @Post('contacts/:id/called')
  @Roles(Role.elderly)
  @ApiOperation({ summary: 'Mark that elderly user called this contact' })
  @ApiResponse({ status: 201, description: 'Call logged' })
  async markCalled(@User() user: RequestUser, @Param('id') id: string) {
    return this.contactsService.markCalled(user.userId, id);
  }

  @Get('elderly/:elderlyProfileId/call-history')
  @ApiOperation({ summary: 'Get call history for an elderly user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Call history' })
  async getCallHistory(
    @User() user: RequestUser,
    @Param('elderlyProfileId') elderlyProfileId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contactsService.getCallHistory(
      user.userId,
      elderlyProfileId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
