const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    // 是否是重要通知（前端可以标红显示）
    isImportant: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);