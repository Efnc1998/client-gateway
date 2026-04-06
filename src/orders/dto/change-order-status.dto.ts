import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export enum OrderStatus {
  PENDING = 'PENDING',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  CONFIRMED = 'CONFIRMED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class ChangeOrderStatusDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsUUID()
  @IsNotEmpty()
  @Type(() => String)
  id: string;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: OrderStatus;
}
