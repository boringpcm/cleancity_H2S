import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cleancity')
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ DB Error:', err));

const ReportSchema = new mongoose.Schema({
  category: String,
  location: { lat: Number, lng: Number },
  image: String,
  status: { type: String, default: 'Received' },
  timestamp: { type: Date, default: Date.now },
  complaintId: String,
  contactName: String,
  contactPhone: String,
  description: String,
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  userId: String // Firebase UID of user who created it
});
const Report = mongoose.model('Report', ReportSchema);

// User Schema for Firebase Auth Integration
const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID
  email: { type: String, required: true },
  name: String,
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

let genAI = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// --- ROUTES ---

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (genAI) {
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `You are CleanCity Bot. User says: "${message}". Keep answer under 20 words.`;
      const result = await model.generateContent(prompt);
      return res.json({ reply: result.response.text() });
    }
    res.json({ reply: "I can help you report issues. Just ask!" });
  } catch (error) { res.json({ reply: "System Offline." }); }
});

app.post('/api/reports', async (req, res) => {
  try {
    const newReport = new Report(req.body);
    await newReport.save();
    res.status(201).json({ message: "Saved", id: newReport._id, complaintId: newReport.complaintId });
  } catch (error) { res.status(500).json({ error: "Save Failed" }); }
});

app.get('/api/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ timestamp: -1 });
    res.json(reports);
  } catch (e) { res.json([]); }
});

app.put('/api/reports/:id', async (req, res) => {
  try { await Report.findByIdAndUpdate(req.params.id, req.body); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: "Error" }); }
});

// --- FIXED: PERMANENT DELETE ROUTE ---
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const result = await Report.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: "Report not found" });
    res.json({ success: true, message: "Permanently deleted" });
  }
  catch (e) { res.status(500).json({ error: "Delete Error" }); }
});

app.post('/api/reports/:id/vote', async (req, res) => {
  try {
    const { type } = req.body;
    const update = type === 'up' ? { $inc: { upvotes: 1 } } : { $inc: { downvotes: 1 } };
    await Report.findByIdAndUpdate(req.params.id, update);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Voting failed" });
  }
});

// === USER MANAGEMENT ENDPOINTS ===

// Create or update user profile
app.post('/api/users', async (req, res) => {
  try {
    const { uid, email, name, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ uid });

    if (user) {
      // Update last login
      user.lastLogin = new Date();
      if (name) user.name = name;
      if (email) user.email = email;
      await user.save();
      return res.json({ success: true, user, message: "User updated" });
    }

    // Create new user
    user = new User({
      uid,
      email,
      name: name || 'User',
      role: role || 'user'
    });

    await user.save();
    res.status(201).json({ success: true, user, message: "User created" });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ error: "User creation failed" });
  }
});

// Get user profile
app.get('/api/users/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Check if user is admin
app.get('/api/users/:uid/isAdmin', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    res.json({ isAdmin: user?.role === 'admin' });
  } catch (error) {
    res.json({ isAdmin: false });
  }
});

// Promote user to admin (for testing - in production, protect this endpoint)
app.put('/api/users/:uid/makeAdmin', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.role = 'admin';
    await user.save();
    res.json({ success: true, message: "User promoted to admin" });
  } catch (error) {
    res.status(500).json({ error: "Failed to promote user" });
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));