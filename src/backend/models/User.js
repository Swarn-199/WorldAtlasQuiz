const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minLength: 3,
    },
    password: {
        type: String,
        required: true
    },
    // --- FLAG GAME STATS ---
    flagHighScore: { type: Number, default: 0 },
    totalFlagGames: { type: Number, default: 0 },
    totalFlagPoints: { type: Number, default: 0 },

    // --- CAPITAL GAME STATS ---
    capitalHighScore: { type: Number, default: 0 },
    totalCapitalGames: { type: Number, default: 0 },
    totalCapitalPoints: { type: Number, default: 0 }
    }, {
    timestamps: true
});

module.exports = mongoose.model('User', userSchema);