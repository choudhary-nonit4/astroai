data "aws_iam_policy_document" "lambda_trust" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "calculator" {
  name               = "${local.prefix}-calculator-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}
resource "aws_iam_role_policy_attachment" "calculator_logs" {
  role       = aws_iam_role.calculator.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role" "api" {
  name               = "${local.prefix}-api-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_trust.json
}
resource "aws_iam_role_policy_attachment" "api_logs" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "api_access" {
  statement {
    actions   = ["lambda:InvokeFunction"]
    resources = [aws_lambda_function.calculator.arn]
  }
  statement {
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem"]
    resources = [aws_dynamodb_table.reports.arn]
  }
  statement {
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.reports.arn}/reports/*"]
  }
}
resource "aws_iam_role_policy" "api_access" {
  name   = "application-access"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api_access.json
}
