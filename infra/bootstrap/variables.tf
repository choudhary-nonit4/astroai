variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "github_repository" {
  description = "GitHub owner/repository, for example nchoudhary/astroai"
  type        = string
}
variable "github_oidc_subject" {
  description = "Exact GitHub OIDC subject. Use the immutable owner/repository IDs for repositories that require them."
  type        = string
  default     = ""
}
variable "create_github_oidc_provider" {
  description = "Set false if this AWS account already has the GitHub Actions OIDC provider."
  type        = bool
  default     = true
}
variable "existing_github_oidc_provider_arn" {
  type    = string
  default = ""
  validation {
    condition     = var.create_github_oidc_provider || var.existing_github_oidc_provider_arn != ""
    error_message = "Provide existing_github_oidc_provider_arn when create_github_oidc_provider is false."
  }
}
