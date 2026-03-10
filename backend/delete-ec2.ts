import { EC2Client, DescribeInstancesCommand, TerminateInstancesCommand } from "@aws-sdk/client-ec2";
import * as dotenv from "dotenv";

dotenv.config();

const client = new EC2Client({
  region: "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

async function run() {
  console.log("🔍 Looking for running instances in eu-north-1...");
  try {
    const describeCmd = new DescribeInstancesCommand({
      Filters: [
        { Name: "instance-state-name", Values: ["running"] }
      ]
    });
    const response = await client.send(describeCmd);
    
    const instances = response.Reservations?.flatMap(r => r.Instances || []) || [];
    
    if (instances.length === 0) {
      console.log("✅ No running instances found in eu-north-1.");
      return;
    }

    const instanceIds = instances.map(i => i.InstanceId as string);
    console.log(`⚠️ Found ${instanceIds.length} running instances: ${instanceIds.join(', ')}`);
    console.log("💥 Terminating instances...");

    const terminateCmd = new TerminateInstancesCommand({
      InstanceIds: instanceIds
    });
    
    const termResponse = await client.send(terminateCmd);
    console.log("✅ Termination initiated:", termResponse.TerminatingInstances?.map(i => `${i.InstanceId}: ${i.CurrentState?.Name}`));

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

run();
