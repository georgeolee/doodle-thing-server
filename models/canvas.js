import mongoose from "mongoose";

const canvasSchema = new mongoose.Schema({
    width: {
        type: String,
        required: true
    },
    height: {
        type: String,
        required: true
    },
    buffer: {
        type: Buffer,
        required: true
    },
    timestamp: {
        type: String,
        required: true
    }
})

export const Canvas = mongoose.model('Canvas', canvasSchema)