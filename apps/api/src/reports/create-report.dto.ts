import { Type } from "class-transformer";
import { IsDateString, IsIn, IsLatitude, IsLongitude, IsString, Matches, MinLength } from "class-validator";

export class CreateReportDto {
  @IsString() @MinLength(2) name!: string;
  @IsDateString() birthDate!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) birthTime!: string;
  @IsString() @MinLength(2) birthPlace!: string;
  @Type(() => Number) @IsLatitude() latitude!: number;
  @Type(() => Number) @IsLongitude() longitude!: number;
  @IsString() @MinLength(3) timeZone!: string;
  @IsIn(["English", "Hindi"]) language!: string;
  @IsIn(["Overview", "Career", "Relationships", "Finance"]) focusArea!: string;
}
