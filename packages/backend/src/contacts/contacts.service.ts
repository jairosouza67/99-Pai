import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CaregiverService } from '../caregiver/caregiver.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Role } from '../common/enums/role.enum';
import { differenceInDays } from 'date-fns';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private supabase: SupabaseService,
    private caregiverService: CaregiverService,
  ) {}

  async getContacts(userId: string, elderlyProfileId: string) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const { data: contacts, error } = await this.supabase.db
      .from('contact')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .order('name', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);

    return { items: contacts || [] };
  }

  async createContact(
    userId: string,
    elderlyProfileId: string,
    createDto: CreateContactDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const { data: contact, error } = await this.supabase.db
      .from('contact')
      .insert({
        elderlyProfileId,
        ...createDto,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(
      `Contact created for elderly profile ${elderlyProfileId}: ${contact.name}`,
    );

    return contact;
  }

  async updateContact(
    userId: string,
    elderlyProfileId: string,
    contactId: string,
    updateDto: UpdateContactDto,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const { data: contact } = await this.supabase.db
      .from('contact')
      .select('id')
      .eq('id', contactId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const { data: updated, error } = await this.supabase.db
      .from('contact')
      .update(updateDto)
      .eq('id', contactId)
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(`Contact updated: ${contactId}`);

    return updated;
  }

  async deleteContact(
    userId: string,
    elderlyProfileId: string,
    contactId: string,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const { data: contact } = await this.supabase.db
      .from('contact')
      .select('id')
      .eq('id', contactId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const { error } = await this.supabase.db
      .from('contact')
      .delete()
      .eq('id', contactId);

    if (error) throw new InternalServerErrorException(error.message);

    this.logger.log(`Contact deleted: ${contactId}`);

    return { success: true };
  }

  async getContactsForElderly(userId: string) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role, elderlyprofile!inner(id)')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.elderly || !user.elderlyprofile) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfileId = Array.isArray(user.elderlyprofile)
      ? user.elderlyprofile[0].id
      : (user.elderlyprofile as any).id;

    const { data: contacts, error } = await this.supabase.db
      .from('contact')
      .select('*')
      .eq('elderlyProfileId', elderlyProfileId)
      .order('name', { ascending: true });

    if (error) throw new InternalServerErrorException(error.message);

    const now = new Date();
    const items = (contacts || []).map((contact: any) => {
      const daysOverdue = contact.lastCallAt
        ? differenceInDays(now, new Date(contact.lastCallAt)) - contact.thresholdDays
        : 999;

      return {
        ...contact,
        daysOverdue: Math.max(0, daysOverdue),
        isOverdue: daysOverdue > 0,
      };
    });

    return { items };
  }

  async markCalled(userId: string, contactId: string) {
    const { data: user } = await this.supabase.db
      .from('user')
      .select('id, role, elderlyprofile!inner(id)')
      .eq('id', userId)
      .single();

    if (!user || user.role !== Role.elderly || !user.elderlyprofile) {
      throw new ForbiddenException(
        'Only elderly users can access this endpoint',
      );
    }

    const elderlyProfileId = Array.isArray(user.elderlyprofile)
      ? user.elderlyprofile[0].id
      : (user.elderlyprofile as any).id;

    const { data: contact } = await this.supabase.db
      .from('contact')
      .select('id')
      .eq('id', contactId)
      .eq('elderlyProfileId', elderlyProfileId)
      .single();

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await this.supabase.db
      .from('contact')
      .update({ lastCallAt: now })
      .eq('id', contactId)
      .select()
      .single();

    if (updateError) throw new InternalServerErrorException(updateError.message);

    // Log call history
    const { error: historyError } = await this.supabase.db
      .from('callhistory')
      .insert({
        elderlyProfileId,
        contactId,
        calledAt: now,
      });

    if (historyError) throw new InternalServerErrorException(historyError.message);

    this.logger.log(`Call logged for contact: ${contactId}`);

    return {
      id: updated.id,
      lastCallAt: updated.lastCallAt,
    };
  }

  async getCallHistory(
    userId: string,
    elderlyProfileId: string,
    page = 1,
    limit = 50,
  ) {
    const hasAccess = await this.caregiverService.verifyAccess(
      userId,
      elderlyProfileId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const skip = (page - 1) * limit;

    const { data: items, count: total, error } = await this.supabase.db
      .from('callhistory')
      .select('*, contact(name)', { count: 'exact' })
      .eq('elderlyProfileId', elderlyProfileId)
      .order('calledAt', { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) throw new InternalServerErrorException(error.message);

    const totalCount = total ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      items: (items || []).map((h: any) => ({
        id: h.id,
        contactId: h.contactId,
        contactName: h.contact?.name || 'Unknown',
        calledAt: h.calledAt,
      })),
      total: totalCount,
      page,
      totalPages,
    };
  }
}
