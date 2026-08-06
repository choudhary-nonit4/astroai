variable "aws_region" {
  type    = string
  default = "ap-south-1"
}
variable "environment" {
  type    = string
  default = "dev"
}
variable "api_zip_path" {
  type    = string
  default = "../../build/api.zip"
}
variable "calculator_zip_path" {
  type    = string
  default = "../../build/calculator.zip"
}
variable "log_retention_days" {
  type    = number
  default = 7
}
