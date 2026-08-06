import { IsDateString, IsIn, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class CreateReportDto {
  @IsString() @MinLength(2) name!: string;
  @IsDateString() birthDate!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) birthTime!: string;
  @IsString() @MinLength(2) birthPlace!: string;
  @IsIn(["English", "Hindi"]) language!: string;
  @IsIn(["Overview", "Career", "Relationships", "Finance"]) focusArea!: string;
}
