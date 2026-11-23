data "aws_caller_identity" "current" {}

resource "aws_kms_key" "files" {
  description             = "KMS key for basic S3 bucket"
  enable_key_rotation     = true
  deletion_window_in_days = 7
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "EnableIAMUserPermissions"
      Effect = "Allow"
      Principal = {
        AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
      }
      Action   = "kms:*"
      Resource = "*"
    }]
  })

}

resource "aws_s3_bucket" "files" {
  #checkov:skip=CKV_AWS_144:Cross-region replication is not required for this development project
  #checkov:skip=CKV_AWS_18:Dedicated access logging is outside the scope of this project
  #checkov:skip=CKV2_AWS_62:No S3 event notification consumer is configured

  bucket = "${var.project}-tf-files"
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.files.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "files" {
  bucket = aws_s3_bucket.files.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_sqs_queue" "notifications" {
  #checkov:skip=CKV_AWS_27:Queue encryption is configured with SQS-managed encryption

  name                       = "${var.project}-tf-notifications"
  sqs_managed_sse_enabled    = true
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 30
}

resource "aws_dynamodb_table" "contacts" {
  #checkov:skip=CKV_AWS_119:AWS-managed KMS encryption is sufficient for this project

  name         = "${var.project}-tf-contacts"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}
