import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { HttpService } from "@nestjs/axios";
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import { CreateReportDto } from "./create-report.dto";
import { Calculation } from "./report.types";

@Injectable()
export class CalculationClient {
  private readonly lambda = new LambdaClient({});
  constructor(private readonly http: HttpService) {}

  async calculate(subject: CreateReportDto): Promise<Calculation> {
    try {
      const functionName = process.env.CALCULATION_FUNCTION_NAME;
      if (functionName) {
        const response = await this.lambda.send(new InvokeCommand({ FunctionName: functionName, Payload: Buffer.from(JSON.stringify(subject)) }));
        if (response.FunctionError || !response.Payload) throw new Error("Calculator invocation failed");
        const result = JSON.parse(Buffer.from(response.Payload).toString()) as Calculation | { errorMessage: string };
        if ("errorMessage" in result) throw new Error(result.errorMessage);
        return result;
      }
      const url = process.env.ASTROLOGY_SERVICE_URL ?? "http://localhost:8000";
      return (await firstValueFrom(this.http.post<Calculation>(`${url}/calculate`, subject))).data;
    } catch {
      throw new ServiceUnavailableException("Astrology calculation service is unavailable");
    }
  }
}
