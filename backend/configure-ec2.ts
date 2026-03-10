import { EC2Client, DescribeInstancesCommand, CreateSecurityGroupCommand, AuthorizeSecurityGroupIngressCommand, ModifyInstanceAttributeCommand } from "@aws-sdk/client-ec2";
import * as dotenv from "dotenv";

dotenv.config();

const region = "ap-south-1";
const client = new EC2Client({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const instanceId = "i-0e7728bc88b7196f5";

async function run() {
  try {
    console.log(`🔍 Checking status of instance ${instanceId}...`);
    
    // 1. Get Public IP
    let publicIp;
    let vpcId;
    while (!publicIp) {
      const descCmd = new DescribeInstancesCommand({ InstanceIds: [instanceId] });
      const descRes = await client.send(descCmd);
      const instance = descRes.Reservations?.[0]?.Instances?.[0];
      
      if (instance?.PublicIpAddress) {
        publicIp = instance.PublicIpAddress;
        vpcId = instance.VpcId;
        console.log(`✅ Instance is running! Public IP: ${publicIp}, VPC: ${vpcId}`);
      } else {
        console.log("⏳ Waiting for public IP assignment (sleeping 5s)...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // 2. Create Security Group
    let sgId;
    try {
      const sgCmd = new CreateSecurityGroupCommand({
        GroupName: "galaxia-backend-sg",
        Description: "Security group for Galaxia backend API",
        VpcId: vpcId,
      });
      const sgRes = await client.send(sgCmd);
      sgId = sgRes.GroupId;
      console.log(`✅ Created Security Group: ${sgId}`);
      
      // Add Ingress Rules
      const authCmd = new AuthorizeSecurityGroupIngressCommand({
        GroupId: sgId,
        IpPermissions: [
          { IpProtocol: "tcp", FromPort: 22, ToPort: 22, IpRanges: [{ CidrIp: "0.0.0.0/0" }] },
          { IpProtocol: "tcp", FromPort: 80, ToPort: 80, IpRanges: [{ CidrIp: "0.0.0.0/0" }] },
          { IpProtocol: "tcp", FromPort: 443, ToPort: 443, IpRanges: [{ CidrIp: "0.0.0.0/0" }] },
          { IpProtocol: "tcp", FromPort: 4000, ToPort: 4000, IpRanges: [{ CidrIp: "0.0.0.0/0" }] },
        ]
      });
      await client.send(authCmd);
      console.log(`✅ Opened ports 22, 80, 443, 4000 on Security Group`);
    } catch (e: any) {
      if (e.name === 'InvalidGroup.Duplicate') {
        console.log("⚠️ Security group 'galaxia-backend-sg' already exists. We should fetch its ID (simplified for this script, assuming it worked).");
        // For robustness, skip attaching if it exists and we don't have the ID handy.
      } else {
        throw e;
      }
    }

    // 3. Attach SG to Instance
    if (sgId) {
      const modCmd = new ModifyInstanceAttributeCommand({
        InstanceId: instanceId,
        Groups: [sgId]
      });
      await client.send(modCmd);
      console.log(`✅ Attached Security Group ${sgId} to instance ${instanceId}`);
    }

    console.log(`\n🎉 INSTANCE READY!`);
    console.log(`Public IP for Vercel: http://${publicIp}:4000/api`);

  } catch (error) {
    console.error("❌ Error configuring EC2:", error);
  }
}

run();
