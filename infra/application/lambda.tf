resource "aws_cloudwatch_log_group" "calculator" {
  name              = "/aws/lambda/${local.prefix}-calculator"
  retention_in_days = var.log_retention_days
}
resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.prefix}-api"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "calculator" {
  function_name    = "${local.prefix}-calculator"
  role             = aws_iam_role.calculator.arn
  runtime          = "python3.13"
  handler          = "app.lambda_handler.handler"
  filename         = var.calculator_zip_path
  source_code_hash = filebase64sha256(var.calculator_zip_path)
  memory_size      = 256
  timeout          = 10
  architectures    = ["arm64"]
  depends_on       = [aws_cloudwatch_log_group.calculator, aws_iam_role_policy_attachment.calculator_logs]
}

resource "aws_lambda_function" "api" {
  function_name    = "${local.prefix}-api"
  role             = aws_iam_role.api.arn
  runtime          = "nodejs22.x"
  handler          = "dist/lambda.handler"
  filename         = var.api_zip_path
  source_code_hash = filebase64sha256(var.api_zip_path)
  memory_size      = 512
  timeout          = 15
  architectures    = ["arm64"]
  environment {
    variables = {
      NODE_ENV                  = "production"
      CALCULATION_FUNCTION_NAME = aws_lambda_function.calculator.function_name
      REPORTS_TABLE_NAME        = aws_dynamodb_table.reports.name
      REPORTS_BUCKET_NAME       = aws_s3_bucket.reports.id
      WEB_ORIGIN                = "https://${aws_cloudfront_distribution.web.domain_name}"
    }
  }
  depends_on = [aws_cloudwatch_log_group.api, aws_iam_role_policy_attachment.api_logs, aws_iam_role_policy.api_access]
}
