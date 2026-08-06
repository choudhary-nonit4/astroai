import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { CalculationClient } from "./reports/calculation.client";
import { ReportsController } from "./reports/reports.controller";
import { ReportsRepository } from "./reports/reports.repository";
import { ReportsService } from "./reports/reports.service";

@Module({
  imports: [HttpModule.register({ timeout: 5_000 })],
  controllers: [HealthController, ReportsController],
  providers: [CalculationClient, ReportsRepository, ReportsService],
})
export class AppModule {}
