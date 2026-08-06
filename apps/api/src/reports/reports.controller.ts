import { Body, Controller, Get, Header, Param, Post } from "@nestjs/common";
import { CreateReportDto } from "./create-report.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Post() create(@Body() input: CreateReportDto) { return this.reports.create(input); }
  @Get(":id") find(@Param("id") id: string) { return this.reports.find(id); }
  @Get(":id/html") @Header("Content-Type", "text/html; charset=utf-8") html(@Param("id") id: string) { return this.reports.renderHtml(id); }
}
