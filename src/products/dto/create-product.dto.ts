import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Iphone 15 Pro' })
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  name: string;

  @ApiProperty({ example: 999.99, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 100, minimum: 0 })
  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  stock: number;
}
