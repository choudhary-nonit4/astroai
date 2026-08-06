import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Injectable } from "@nestjs/common";
import { Report } from "./report.types";

@Injectable()
export class ReportsRepository {
  private readonly local = new Map<string, Report>();
  private readonly documentClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: {
      convertClassInstanceToMap: true,
      removeUndefinedValues: true,
    },
  });

  async save(report: Report): Promise<void> {
    const tableName = process.env.REPORTS_TABLE_NAME;
    if (!tableName) {
      this.local.set(report.id, report);
      return;
    }
    await this.documentClient.send(new PutCommand({
      TableName: tableName,
      Item: { pk: `REPORT#${report.id}`, sk: "REPORT", ...report },
      ConditionExpression: "attribute_not_exists(pk)",
    }));
  }

  async findById(id: string): Promise<Report | null> {
    const tableName = process.env.REPORTS_TABLE_NAME;
    if (!tableName) return this.local.get(id) ?? null;
    const result = await this.documentClient.send(new GetCommand({
      TableName: tableName,
      Key: { pk: `REPORT#${id}`, sk: "REPORT" },
    }));
    return (result.Item as Report | undefined) ?? null;
  }
}
