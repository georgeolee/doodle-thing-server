import express from 'express'
import { Canvas } from '../models/canvas.js'

import { io, getCanvasTimeStamp, getGhostSocket } from '../index.js'

import {Readable} from 'stream'
import mongoose from 'mongoose'

export const router = express.Router()

import {CanvasCache} from '../CanvasCache.js'

const cache = new CanvasCache();




let lastSave = null;

let isSaving = false;

//CORS
router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)  
    res.header('access-control-expose-headers', 'x-timestamp, retry-after')  
    console.log(`${req.method}: ${req.originalUrl}`)
    next()
})


// errors
router.use((err, req, res, next) => {
    console.log(err)
    res.status(500).send('whoops. something weird happened')
})


//canvas timestamp - clients can compare to see if canvas update is necessary
router.get('/timestamp', (req, res) => {
    const ts = getCanvasTimeStamp()
    res.header('content-type', 'text/plain')
    res.header('x-timestamp', ts)
    res.status(200).send(ts)
})

//check ghost availability in case the dyno is just waking up
router.use('/', async (req, res, next) => {
    const ghost = await getGhostSocket()
    
    if(ghost != null){
        console.log('canvas request - ghost ready')
        next() //good to go
    } 

    else{   //puppeteer client still launching - tell client to retry after a few seconds
        console.log('canvas request - ghost still waking up')
        res.header('retry-after', '10')
        res.status(503).send('still waking up')
    }
})

//get canvas binary data
router.get('/', async (req, res) => {
    
    const start = Date.now()

    const mils = (message = '') => {
        console.log(`${message}-------${Date.now() - start}ms since GET request received`)
    }

    //get query params
    const {width = 300, height = 300} = req.query
    
    //check if cached buffer is up to date
    const cached = cache.getEntry(width, height);
    if(cached != null && cached.isStale === false){
        sendCanvasBinary(res, cached.buffer, cached.timestamp);
        return console.log('no timestamp change ---- sending cached canvas buffer');
    }


    getCanvasBlob({width, height})
        .then(blob => {
            console.log(`got canvas blob; length: ${blob.length}`)
            mils('blob success')

            const buffer = Buffer.from(blob, 'binary')
            const timestamp = getCanvasTimeStamp()

            //update the cached values
            cache.setEntry({buffer, width, height, timestamp})

            //send canvas data to client
            sendCanvasBinary(res, buffer, timestamp);                        

        })
        .catch(e => {
            mils('blob error')
            console.log('error getting blob',e)
            res.status(500).send('error getting canvas data')
        })

})

async function getCanvasBlob(dimensions = {}){
    
    //request specific dimensions or default
    const {width, height} = dimensions;

    const blobPromise = new Promise(async (resolve, reject) => {        

        const ghost = await getGhostSocket();
        
        //pass acknowledge callback to ghost client socket
        const ack = (error, blob) => {
            if(error) reject(error);
            else resolve(blob);
        }

        ghost.emit('blob', {width, height}, ack)
    });    

    return blobPromise;
}

function sendCanvasBinary(res, buffer, timestamp){
    res.header('content-type', 'image/png')
    res.header('content-length', buffer.length)
    res.header('x-timestamp', timestamp)                
    // res.status(200).send(buffer)


    const stream = Readable.from(buffer)

    stream.on('close', () => {
        console.log(`sendCanvasBinary: stream closed`);
    })

    stream.on('error', e => {
        res.status(500).send('server error')
        stream?.destroy()
        next(e)
    })

    res.status(200);
    stream.pipe(res);
}

async function updateDBCanvas(fields){

    const {timestamp, width, height} = fields;
    
    try{

        if(isSaving) throw new Error('save operation already in progress')
        isSaving = true;

        const canvas = new Canvas({...fields});

        await canvas.save();
        console.log('saved canvas to db');

        lastSave = timestamp;

        const results = await Canvas.find({width,height})
                                    .select('timestamp')
                                    .sort({timestamp: 1})
                                    .collation({locale: 'en_US', numericOrdering: true})
                                    .exec()

        console.log(results);
        
        isSaving = false;

    }catch(e){
        console.log(e)
    }
}


function wait(mils){
    return new Promise((resolve, ) => {
        setTimeout(resolve, mils);
    })
}

async function dbUpdateLoop(){
    const sleepTime = 10*60*1000
    while(true){
        
        await wait(sleepTime)


    }
}

// setInterval(() => {
//     if(!isSaving && canvasBuffer && lastSave !== bufferTimestamp){
//         saveCanvasToDB({
//             buffer: canvasBuffer,
//             timestamp: bufferTimestamp,
//         })
//     }
// }, 10000)

