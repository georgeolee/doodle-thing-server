import mongoose from "mongoose";

const canvasDataSchema = new mongoose.Schema({
    width: {
        type: Number
    },
    height: {
        type: Number
    },
    dataURL: {
        type: String,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
})

export const CanvasData = mongoose.model('CanvasData', canvasDataSchema)