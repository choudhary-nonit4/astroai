resource "aws_cloudwatch_log_group" "containers" {
  for_each          = toset(["web", "api", "calculator"])
  name              = "/astroai/${var.environment}/${each.key}"
  retention_in_days = var.log_retention_days
}
