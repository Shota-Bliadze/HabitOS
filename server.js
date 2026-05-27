require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── CONNECT DB ──
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ DB error:", err));

// ── MODELS ──
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt:{ type: Date, default: Date.now }
});

const HabitDataSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  habits:  { type: Array, default: [] },
  checked: { type: Object, default: {} },
  theme:   { type: Object, default: { accent: "#5555cc", bg: "#080814" } },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const HabitData = mongoose.model("HabitData", HabitDataSchema);

// ── AUTH MIDDLEWARE ──
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ── AUTH ROUTES ──
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ error: "Password must be at least 6 characters" });

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ error: "Username or email already taken" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });

    // Create default habit data for new user
    await HabitData.create({ userId: user._id });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "No account with that email" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, username: user.username });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── DATA ROUTES ──
app.get("/api/data", auth, async (req, res) => {
  try {
    let data = await HabitData.findOne({ userId: req.user.id });
    if (!data) data = await HabitData.create({ userId: req.user.id });
    res.json(data);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/data", auth, async (req, res) => {
  try {
    const { habits, checked, theme } = req.body;
    const data = await HabitData.findOneAndUpdate(
      { userId: req.user.id },
      { habits, checked, theme, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// ── SERVE FRONTEND ──
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));