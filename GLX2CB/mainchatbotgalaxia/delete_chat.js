require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  
  // Find conversations for this phone number
  const convos = await db.collection('conversations').find({ 
    customerPhone: { $regex: '98200.*79272' } 
  }).toArray();
  
  console.log('Found conversations:', convos.length);
  convos.forEach(c => console.log(c._id, c.customerPhone, c.sessionId, c.botType, c.createdAt));

  if (convos.length > 0) {
    // Get session IDs to delete messages too
    const sessionIds = convos.map(c => c.sessionId);
    
    // Delete messages
    const msgResult = await db.collection('messages').deleteMany({ sessionId: { $in: sessionIds } });
    console.log('Deleted messages:', msgResult.deletedCount);
    
    // Delete conversations
    const convoResult = await db.collection('conversations').deleteMany({ customerPhone: { $regex: '98200.*79272' } });
    console.log('Deleted conversations:', convoResult.deletedCount);
  }
  
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
