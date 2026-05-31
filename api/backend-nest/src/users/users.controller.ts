import {
  Controller, Get, Post, Put, Patch, Body, Param, Query, Req, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { UpsertUserDto } from './dto/upsert-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // POST /users/sync — sync Firebase → Neon (appelé au login)
  @Post('sync')
  @UseGuards(FirebaseAuthGuard)
  async syncUser(@Body() dto: UpsertUserDto) {
    return this.usersService.upsertUser(dto);
  }

  // GET /users/me — mon profil complet
  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  async getMe(@Req() req: any) {
    return this.usersService.getUserByFirebaseUid(req.user.uid);
  }

  // PUT /users/me — mettre à jour mon profil
  @Put('me')
  @UseGuards(FirebaseAuthGuard)
  async updateMe(@Body() dto: UpdateUserDto, @Req() req: any) {
    return this.usersService.updateProfile(req.user.uid, dto);
  }

  // PATCH /users/me/presence — mettre à jour lastActiveAt
  @Patch('me/presence')
  @UseGuards(FirebaseAuthGuard)
  async updatePresence(@Req() req: any) {
    return this.usersService.updatePresence(req.user.uid);
  }

  // POST /users/:id/follow — suivre/ne plus suivre
  @Post(':id/follow')
  @UseGuards(FirebaseAuthGuard)
  async toggleFollow(@Param('id') sellerId: string, @Req() req: any) {
    return this.usersService.toggleFollow(req.user.uid, sellerId);
  }

  // GET /users/search — rechercher des vendeurs
  @Get('search')
  async searchSellers(
    @Query('q') query: string,
    @Query('neighborhood') neighborhood?: string,
  ) {
    return this.usersService.searchSellers(query ?? '', neighborhood);
  }

  // GET /users/:id — profil public d'un user
  @Get(':id')
  async getPublicProfile(@Param('id') firebaseUid: string) {
    return this.usersService.getPublicProfile(firebaseUid);
  }
}
