import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    try {
      return await this.authService.login(body.email, body.password);
    } catch (error) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }
  @Post('register')
  async register(@Body() body: { email: string; password: string }) {
    try {
      return await this.authService.register(body.email, body.password);
    } catch (error) {
      throw error;
    }
  }
}
