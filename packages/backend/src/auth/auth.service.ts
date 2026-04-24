import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { SupabaseService } from '../supabase/supabase.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '../common/enums/role.enum';
import { maskEmail } from '../common/utils/mask.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private supabase: SupabaseService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const {
      email,
      password,
      name,
      role,
      cellphone,
      nickname,
      document,
      birthday,
    } = signupDto;

    const normalizedEmail = email.trim().toLowerCase();

    // Defense in depth: public signup must never create admin accounts.
    const allowedSignupRoles = new Set<Role>([
      Role.elderly,
      Role.caregiver,
      Role.provider,
    ]);
    if (!allowedSignupRoles.has(role)) {
      this.logger.warn(`Blocked public signup with privileged role: ${role}`);
      throw new ForbiddenException('This role cannot be created via public signup');
    }

    // Check if user exists
    const { data: existingUser, error: existingUserError } = await this.supabase.db
      .from('user')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    this.ensureSupabaseOk(existingUserError, 'signup:check-existing-user');

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if cellphone is already registered (if provided)
    if (cellphone) {
      const { data: existingCellphone } = await this.supabase.db
        .from('user')
        .select('id')
        .eq('cellphone', cellphone)
        .single();

      if (existingCellphone) {
        throw new ConflictException('Cellphone already registered');
      }
    }

    // Hash password — OWASP 2025 recommends cost ≥ 12
    const BCRYPT_COST = 12;
    const hashedPassword = await bcrypt.hash(password, BCRYPT_COST);

    // Create user with optional PAI fields
    const { data: user, error } = await this.supabase.db
      .from('user')
      .insert({
        email: normalizedEmail,
        password: hashedPassword,
        name,
        role,
        cellphone,
        nickname,
        document,
        birthday: birthday ? new Date(birthday).toISOString() : undefined,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException(error.message);

    // Only create elderly profile with link code if role is elderly
    if (role === Role.elderly) {
      const linkCode = this.generateLinkCode();
      const { error: profileError } = await this.supabase.db
        .from('elderlyprofile')
        .insert({
          userId: user.id,
          linkCode,
        });

      if (profileError) throw new InternalServerErrorException(profileError.message);
    }
    // Note: caregiver and provider roles do NOT create elderlyprofile

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.logger.log(`User signed up: ${maskEmail(email)} (${role})`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const normalizedEmail = email.trim().toLowerCase();

    // Find user
    const { data: user, error: userError } = await this.supabase.db
      .from('user')
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    this.ensureSupabaseOk(userError, 'login:find-user');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    this.logger.log(`User logged in: ${maskEmail(email)}`);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getMe(userId: string) {
    const { data: user, error: userError } = await this.supabase.db
      .from('user')
      .select('id, email, name, role, elderlyprofile(onboardingComplete)')
      .eq('id', userId)
      .single();

    this.ensureSupabaseOk(userError, 'auth-me:find-user');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const elderlyProfile = Array.isArray(user.elderlyprofile)
      ? user.elderlyprofile[0]
      : user.elderlyprofile;

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingComplete: elderlyProfile?.onboardingComplete ?? false,
      },
    };
  }

  private generateLinkCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
  }

  private ensureSupabaseOk(error: any, context: string) {
    if (!error) {
      return;
    }

    // Supabase `.single()` returns PGRST116 when no rows are found.
    if (error.code === 'PGRST116') {
      return;
    }

    this.logger.error(`Supabase error (${context}): ${error.message}`);
    throw new ServiceUnavailableException('Authentication service unavailable');
  }
}
