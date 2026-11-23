output "bucket_name" { value = aws_s3_bucket.files.bucket }
output "queue_url" { value = aws_sqs_queue.notifications.url }
output "table_name" { value = aws_dynamodb_table.contacts.name }
