#!/bin/bash
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
INSTANCE_ID=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)
SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query "Reservations[0].Instances[0].SecurityGroups[0].GroupId" --output text --region ap-south-1)
echo "Instance: $INSTANCE_ID  SG: $SG_ID"
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 4001 --cidr 0.0.0.0/0 --region ap-south-1 2>&1
echo "Done"
