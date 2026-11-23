resource "aws_s3_bucket" "files" {
  bucket = "${var.project}-tf-files"
}

resource "aws_sqs_queue" "notifications" {
  name = "${var.project}-tf-notifications"
}

resource "aws_dynamodb_table" "contacts" {
  name         = "${var.project}-tf-contacts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"
  attribute {
    name = "id"
    type = "S"
  }
}
