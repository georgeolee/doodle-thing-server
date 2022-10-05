import mongoose from "mongoose";

const canvasSchema = new mongoose.Schema({
    width: {
        type: Number
    },
    height: {
        type: Number
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