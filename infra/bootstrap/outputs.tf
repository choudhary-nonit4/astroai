output "state_bucket" { value = aws_s3_bucket.state.id }
output "github_deploy_role_arn" { value = aws_iam_role.github_deploy.arn }
output "github_oidc_provider_arn" { value = local.oidc_arn }
