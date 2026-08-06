terraform {
  required_version = ">= 1.10.0"
  backend "s3" {
    bucket       = "configured-by-github-actions"
    key          = "astroai/dev/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 6.0" }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.tags }
}
