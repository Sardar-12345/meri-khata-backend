const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'meri_khata_pro';
const COLLECTION_NAME = 'backups';

let client;
let collection;

async function connectDB() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  collection = db.collection(COLLECTION_NAME);
  await collection.createIndex({ mobile: 1 }, { unique: true });
  console.log('Connected to MongoDB');
}

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Mera Khata Pro backend chal raha hai.' });
});

// Upload/overwrite a customer's full backup data
app.post('/backup/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const { data } = req.body;

    if (!mobile || !data) {
      return res.status(400).json({ error: 'Mobile number aur data zaroori hai.' });
    }

    await collection.updateOne(
      { mobile },
      { $set: { mobile, data, updatedAt: new Date() } },
      { upsert: true }
    );

    res.json({ success: true, message: 'Backup save ho gaya.' });
  } catch (error) {
    console.error('Backup upload error:', error);
    res.status(500).json({ error: 'Backup save karte hue masla hua.' });
  }
});

// Download a customer's latest backup data
app.get('/backup/:mobile', async (req, res) => {
  try {
    const { mobile } = req.params;
    const record = await collection.findOne({ mobile });

    if (!record) {
      return res.status(404).json({ error: 'Is mobile number ke liye koi backup nahi mila.' });
    }

    res.json({ success: true, data: record.data, updatedAt: record.updatedAt });
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ error: 'Backup fetch karte hue masla hua.' });
  }
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Server chal raha hai port ${PORT} par`));
  })
  .catch((err) => {
    console.error('MongoDB connect nahi ho saka:', err);
    process.exit(1);
  });
