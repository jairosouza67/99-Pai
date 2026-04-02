declare module '@nestjs/throttler' {
  import { Module, DynamicModule, Provider } from '@nestjs/common';
  
  export interface ThrottlerModuleOptions {
    ttl?: number;
    limit?: number;
  }
  
  export class ThrottlerModule {
    static forRoot(options: ThrottlerModuleOptions[]): DynamicModule;
  }
  
  export class ThrottlerGuard {}
}

declare module '@nestjs/jwt' {
  import { Module, DynamicModule } from '@nestjs/common';
  
  export interface JwtModuleOptions {
    secret?: string;
    signOptions?: { expiresIn?: string | number };
  }
  
  export class JwtModule {
    static register(options: JwtModuleOptions): DynamicModule;
    static registerAsync(options: any): DynamicModule;
  }
  
  export class JwtService {
    sign(payload: any, options?: any): string;
    verify(token: string, options?: any): any;
    decode(token: string, options?: any): any;
  }
}

declare module '@nestjs/passport' {
  import { Module, CanActivate, Type } from '@nestjs/common';
  
  export class PassportModule {
    static register(options?: any): DynamicModule;
  }
  
  export function AuthGuard(strategy: string): Type<CanActivate>;
  
  export function PassportStrategy(
    strategy: any, 
    name?: string, 
    callbackArity?: number
  ): Type<any>;
}
