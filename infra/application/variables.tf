variable "aws_region" {
  type    = string
  default = "us-east-1"
}
variable "environment" {
  type    = string
  default = "dev"
}
variable "instance_type" {
  description = "Small burstable EC2 instance type for the MVP."
  type        = string
  default     = "t3.micro"
}
variable "root_volume_size" {
  description = "Encrypted gp3 root disk size in GiB."
  type        = number
  default     = 16
}
variable "log_retention_days" {
  description = "CloudWatch retention for container logs."
  type        = number
  default     = 7
}
