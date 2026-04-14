const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
})
.then(() => console.log('🟢 MongoDB connected'))
.catch(err => console.error('🔴 MongoDB connection error:', err));

// DOOR 1: REGISTER A NEW PLAYER (DEBUG MODE)
app.post('/register', async (req, res) => {
  console.log("🚨 STEP 1: Data received:", req.body);

  try {
    const { username, password } = req.body;

    console.log("🚨 STEP 2: Checking MongoDB for existing user...");
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log("⚠️ Username taken!");
      return res.status(400).json({ message: 'Username is already taken!' });
    }

    console.log("🚨 STEP 3: User is new. Scrambling password with bcrypt...");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log("🚨 STEP 4: Password scrambled! Saving to MongoDB...");
    const newUser = new User({ 
      username: username, 
      password: hashedPassword 
    });
    await newUser.save();

    console.log("✅ STEP 5: SUCCESS! User saved to database.");
    res.status(201).json({ message: 'Account created successfully!', username: newUser.username });
    
  } catch (error) {
    console.log("❌ CRASH DETECTED!");
    console.log("❌ THE EXACT ERROR IS:", error.message);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
    try{
        const {username, password} = req.body;
        const user = await User.findOne({ username });
        if (!user){
            return res.status(400).json({ message: 'Invalid username or password!' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch){
            return res.status(400).json({ message: 'Invalid username or password!' });
        }

        res.status(200).json({ message: 'Login successful!', 
            username: user.username, 
            highscore: user.highscore
        });
    } catch(error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in!' });
    }
});

app.post('/save-game', async (req, res) => {
    try {
        const { username, score, mode } = req.body;

        const user = await User.findOne({ username });
        if(!user){
            return res.status(400).json({message: 'User not found!'});
        }

        let isNewHighscore = false;
        if (mode === 'flags') {
            user.totalFlagGames += 1;
            user.totalFlagPoints += score;
            if (score > user.flagHighScore) {
                user.flagHighScore = score;
                isNewHighScore = true;
            }
        } 
        else if (mode === 'capitals') {
            user.totalCapitalGames += 1;
            user.totalCapitalPoints += score;
            if (score > user.capitalHighScore) {
                user.capitalHighScore = score;
                isNewHighScore = true;
            }
        }

        await user.save();

        res.status(200).json({
            message: 'Stats saved successfully!',
            newHighscore: isNewHighscore,
        });
    } catch (error) {
        console.error('Error saving game stats:', error);
        res.status(500).json({ message: 'Error saving game stats!' });
    }
});

app.get('/user-stats/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Send back only the stats we need
    res.json({
      username: user.username,
      flagHighScore: user.flagHighScore,
      totalFlagPoints: user.totalFlagPoints,
      capitalHighScore: user.capitalHighScore,
      totalCapitalPoints: user.totalCapitalPoints
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});


//Creating test route
app.get('/', (req, res) => {
    res.send('Welcome to the Atlastic API!!!');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});