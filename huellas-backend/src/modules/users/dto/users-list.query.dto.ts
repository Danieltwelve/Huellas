import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class UsersListQueryDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 1;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 1;
  })
  page = 1;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return 12;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 12;
  })
  limit = 12;

  @IsOptional()
  @IsString()
  search?: string;
}
