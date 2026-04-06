import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Type(() => Number)
  productId: number;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ example: 99.99, minimum: 0 })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Type(() => Number)
  price: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
