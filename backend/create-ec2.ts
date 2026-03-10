import { EC2Client, RunInstancesCommand, CreateKeyPairCommand } from "@aws-sdk/client-ec2";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

const region = "ap-south-1";
const client = new EC2Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

async function run() {
  try {
    console.log(`🚀 Starting EC2 Provisioning in ${region} (Mumbai)...`);

    // 1. Create a new Key Pair
    const keyName = `galaxia-key-${Date.now()}`;
    console.log(`🔑 Creating Key Pair: ${keyName}`);
    const keyCmd = new CreateKeyPairCommand({ KeyName: keyName });
    const keyResponse = await client.send(keyCmd);
    
    // Save the private key locally
    const pemPath = `./${keyName}.pem`;
    fs.writeFileSync(pemPath, keyResponse.KeyMaterial || "");
    console.log(`✅ Saved private key to ${pemPath}`);

    // Amazon Linux 2023 AMI in ap-south-1 (Mumbai) -> ami-0a0f1259dd1c90938 (x86_64) typically, 
    // but a safer approach is to use SSM to get the latest AL2023 AMI, resolving it.
    // For simplicity, we can use the widely known AL2023 AMI ID in ap-south-1: ami-0ddfba243cbee3768
    // Let's use the standard Amazon Linux 2023 AMI for ap-south-1
    const amiId = "ami-0ddfba243cbee3768"; 

    // User Data to automatically install Node, Git, PM2, and clone repo
    const userDataScript = `#!/bin/bash
sudo yum update -y
sudo yum install git -y
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
git clone https://github.com/HKTech05/galaxia.git /home/ec2-user/galaxia
cd /home/ec2-user/galaxia/backend
npm install
npm install -g pm2
chown -R ec2-user:ec2-user /home/ec2-user/galaxia
`;
    const encodedUserData = Buffer.from(userDataScript).toString('base64');

    console.log(`💻 Launching EC2 Instance (t3.micro) with AMI ${amiId}...`);
    // 2. Launch the Instance
    const runCmd = new RunInstancesCommand({
      ImageId: amiId,
      InstanceType: "t3.micro", // Free tier eligible in ap-south-1
      KeyName: keyName,
      MinCount: 1,
      MaxCount: 1,
      UserData: encodedUserData,
      TagSpecifications: [
        {
          ResourceType: "instance",
          Tags: [{ Key: "Name", Value: "galaxia-backend-mumbai" }]
        }
      ]
    });

    const runResponse = await client.send(runCmd);
    const instanceId = runResponse.Instances?.[0]?.InstanceId;
    
    console.log(`✅ Instance initiated! Instance ID: ${instanceId}`);
    
  } catch (error) {
    console.error("❌ Error provisioning EC2:", error);
  }
}

run();
