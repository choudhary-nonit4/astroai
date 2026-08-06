output "website_url" { value = "https://${aws_cloudfront_distribution.web.domain_name}" }
output "api_url" { value = aws_apigatewayv2_api.api.api_endpoint }
output "web_bucket_name" { value = aws_s3_bucket.web.id }
output "reports_bucket_name" { value = aws_s3_bucket.reports.id }
output "cloudfront_distribution_id" { value = aws_cloudfront_distribution.web.id }
output "api_function_name" { value = aws_lambda_function.api.function_name }
output "calculator_function_name" { value = aws_lambda_function.calculator.function_name }
