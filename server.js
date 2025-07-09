const express = require('express');
const AWS = require('aws-sdk');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 3001;
AWS.config.update({ region: process.env.AWS_REGION });
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.AWS_TABLE;
app.use(cors());
app.use(bodyParser.json());
app.post('/api/signup', async (req, res) => {
  const { email, firstName, lastName, password } = req.body;
  console.log('Received signup data:', { email, firstName, lastName });
  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({ message: '⚠️ Please fill all fields' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const params = {
    TableName: TABLE_NAME,
    Item: {
      email,
      firstName,
      lastName,
      password: hashedPassword,
      isApproved: 'pending',
    },
    ConditionExpression: 'attribute_not_exists(email)', 
  };
  try {
    await dynamoDb.put(params).promise();
    res.status(200).json({ message: '✅ Request submitted for admin approval.' });
  } catch (err) {
    if (err.code === 'ConditionalCheckFailedException') {
      try {
        const check = await dynamoDb.get({
          TableName: TABLE_NAME,
          Key: { email },
        }).promise();
        const existing = check.Item;
        if (!existing) {
          return res.status(400).json({ message: '❌ Unknown error with email check.' });
        }
        if (existing.isApproved === 'rejected') {
          return res.status(403).json({ message: '❌ Your request was rejected by admin.' });
        }
        if (existing.isApproved === 'approved') {
          return res.status(400).json({ message: '⚠️ Email already exists and is approved.' });
        }
        return res.status(400).json({ message: '⚠️ Request already submitted. Please wait for approval.' });
      } catch (innerErr) {
        console.error('⚠️ Error reading existing item:', innerErr);
        return res.status(500).json({ message: 'Server error during duplicate email check.' });
      }
    }
    console.error('❌ Signup error:', err);
    res.status(500).json({ message: '❌ Server error saving signup.' });
  }
});
app.get('/api/users/:email', async (req, res) => {
  const email = decodeURIComponent(req.params.email);
  const params = {
    TableName: TABLE_NAME,
    Key: { email },
  };
  try {
    const result = await dynamoDb.get(params).promise()
    if (!result.Item) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ isApproved: result.Item.isApproved });
  } catch (err) {
    console.error('❌ Error checking approval status:', err);
    res.status(500).json({ message: '❌ Server error checking status.' });
  }
});
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ loginSuccess: false, message: '⚠️ Email and password required.' });
  }
  const params = {
    TableName: TABLE_NAME,
    Key: { email },
  };
  try {
    const result = await dynamoDb.get(params).promise();
    const user = result.Item;
    if (!user) {
      return res.status(404).json({ loginSuccess: false, message: '❌ User not found.' });
    }

    if (user.isApproved !== 'approved') {
      return res.status(403).json({ loginSuccess: false, message: '⏳ Not yet approved by admin.' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ loginSuccess: false, message: '❌ Incorrect password.' });
    }
    return res.status(200).json({ loginSuccess: true });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ loginSuccess: false, message: '❌ Server error during login.' });
  }
});
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
