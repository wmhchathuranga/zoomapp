const mongoose = require('mongoose');

const zoomWebhookSchema = new mongoose.Schema({
    // Define your schema fields based on Zoom webhook data
    // For example:
    event: String,
    payload: Object,
    // Add more fields as needed
});

const ZoomWebhook = mongoose.model('ZoomWebhook', zoomWebhookSchema);
