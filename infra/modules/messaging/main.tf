resource "aws_sqs_queue" "this" {
  name                       = var.name
  sqs_managed_sse_enabled    = true
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 30
}
