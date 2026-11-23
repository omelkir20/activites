resource "aws_sqs_queue" "this" {
  name                    = var.name
  sqs_managed_sse_enabled = true
}
