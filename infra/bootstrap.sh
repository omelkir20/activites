#!/usr/bin/env bash
set -euo pipefail

AWS="aws --profile floci --endpoint-url http://localhost:4566"
BUCKET="tfstate-portfolio"

echo ">> Bucket de state : $BUCKET"
$AWS s3api head-bucket --bucket "$BUCKET" 2>/dev/null || $AWS s3 mb "s3://$BUCKET"
$AWS s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

echo ">> Table de verrou : tf-locks"
$AWS dynamodb describe-table --table-name tf-locks >/dev/null 2>&1 || \
  $AWS dynamodb create-table --table-name tf-locks \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST >/dev/null

echo ">> Bootstrap terminé"
