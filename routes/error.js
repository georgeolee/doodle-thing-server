import express from 'express'

import mongoose from 'mongoose';

import { ClientError } from '../models/error.js';

export const router = express.Router();

//post errors as plain json objects
router.use(express.json({
    type: '*/*'
}))

router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)
    res.header('access-control-allow-headers', 'content-type')
    next()
})

router.post('/', (req, res, next) => {
    try{        
        const err = req.body;            
        res.status(200).send();

        processError(err)

    }catch(e){

        res.status(500).send();
        console.error(e)
    }    
})

async function processError(err){
    try{
        console.log('\n\nerror reported from client:')
        console.log(err,'\n\n')
        const error = new ClientError({...err, json: JSON.stringify(err)})
        await error.save()
        console.log('saved to db')
    }catch(e){
        console.log('server-side error while processing error from client:')
        console.error(e)
    }
}