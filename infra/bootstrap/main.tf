data "aws_caller_identity" "current" {}

locals {
  state_bucket   = "astroai-tfstate-${data.aws_caller_identity.current.account_id}"
  oidc_arn       = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_github_oidc_provider_arn
  github_subject = var.github_oidc_subject != "" ? var.github_oidc_subject : "repo:${var.github_repository}:environment:dev"
}

resource "aws_s3_bucket" "state" {
  bucket = local.state_bucket
  tags   = { Project = "AstroAI", Purpose = "TerraformState", ManagedBy = "Terraform" }
  lifecycle { prevent_destroy = true }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = var.create_github_oidc_provider ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  tags            = { Project = "AstroAI", ManagedBy = "Terraform" }
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_subject]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name                 = "astroai-github-deploy"
  assume_role_policy   = data.aws_iam_policy_document.github_trust.json
  max_session_duration = 3600
  tags                 = { Project = "AstroAI", ManagedBy = "Terraform" }
}

resource "aws_iam_role_policy_attachment" "power_user" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

data "aws_iam_policy_document" "deployment_iam" {
  statement {
    sid = "ManageAstroAiExecutionRoles"
    actions = [
      "iam:CreateRole", "iam:DeleteRole", "iam:GetRole", "iam:TagRole", "iam:UntagRole",
      "iam:UpdateAssumeRolePolicy", "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:GetRolePolicy",
      "iam:AttachRolePolicy", "iam:DetachRolePolicy", "iam:ListAttachedRolePolicies", "iam:ListRolePolicies",
      "iam:ListInstanceProfilesForRole", "iam:PassRole"
    ]
    resources = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/astroai-*"]
  }
}

resource "aws_iam_role_policy" "deployment_iam" {
  name   = "manage-astroai-execution-roles"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.deployment_iam.json
}
