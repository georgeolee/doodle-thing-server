import mongoose from "mongoose";

const errorSchema = new mongoose.Schema({
    
    //standard error properties
    name: {
        type: 'string',
        required: true,
    },

    message: {
        type: 'string',
        required: true,
    },


    //json representation of the error
    json: {
        type: 'string',
        required: true,
    },

    //non-standard error properties
    fileName: {
        type: 'string',
        required: false,
    },    

    lineNumber: {
        type: 'string',
        required: false,
    },

    columnNumber: {
        type: 'string',
        required: false,
    },

    stack: {
        type: 'string',
        required: false,
    },

    cause: {
        type: 'string',
        required: false,
    },



})


export const ClientError = new mongoose.model('ClientError', errorSchema)
export const ServerError = new mongoose.model('ServerError', errorSchema)