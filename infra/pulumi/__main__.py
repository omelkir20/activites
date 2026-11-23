import pulumi, pulumi_aws as aws

floci = aws.Provider("floci",
    region="us-east-1", access_key="test", secret_key="test",
    skip_credentials_validation=True, skip_metadata_api_check=True,
    skip_requesting_account_id=True, s3_use_path_style=True,
    endpoints=[aws.ProviderEndpointArgs(
        s3="http://localhost:4566", sqs="http://localhost:4566")])

bucket = aws.s3.Bucket("pulumi-bucket", bucket="portfolio-pulumi", opts=pulumi.ResourceOptions(provider=floci))
pulumi.export("bucket", bucket.bucket)
