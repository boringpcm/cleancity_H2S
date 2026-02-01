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
  downvotes: { type: Number, default: 0 }
});
const Report = mongoose.model('Report', ReportSchema);

let genAI = null;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

// --- ROUTES ---

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (genAI) {
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
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

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));