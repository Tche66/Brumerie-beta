import { IsString, IsOptional, IsEmail, IsIn } from 'class-validator';

export class UpsertUserDto {
  @IsString() firebaseUid: string;
  @IsEmail() email: string;
  @IsString() name: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() photoURL?: string;
  @IsIn(['buyer', 'seller', 'livreur']) @IsOptional() role?: string;
}
