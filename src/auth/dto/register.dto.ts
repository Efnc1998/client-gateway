import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', minLength: 2 })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @Type(() => String)
  name: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @Type(() => String)
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Type(() => String)
  password: string;
}
