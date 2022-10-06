import express from 'express'
import { Canvas } from '../models/canvas.js'

import { io, getCanvasTimeStamp } from '../index.js'

import {Readable} from 'stream'

export const router = express.Router()

let canvasBuffer = null
let bufferTimestamp = null

let lastSave = bufferTimestamp;
let isSaving = false;

//CORS
router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)    
    console.log(`${req.method}: ${req.originalUrl}`)
    next()
})

//errors
// router.use((err, req, res, next) => {

// })


//look into ---> res.write (streaming big canvas buffer)?


//canvas timestamp - clients can compare to see if canvas update is necessary
router.get('/timestamp', (req, res) => {
    const ts = getCanvasTimeStamp()
    res.header('access-control-expose-headers', 'x-timestamp')
    res.header('content-type', 'text/plain')
    res.header('x-timestamp', ts)
    res.status(200).send(ts)
})

//get canvas binary data
router.get('/', async (req, res) => {
    
    const start = Date.now()

    const mils = (message = '') => {
        console.log(`${message}-------${Date.now() - start}ms since GET request received`)
    }

    const {width, height} = req.query
    // const {width, height} = {width: 300, height: 300}
    

    //cached buffer is up to date
    if(bufferTimestamp === getCanvasTimeStamp() && canvasBuffer){
        sendCanvasBinary(res, canvasBuffer, bufferTimestamp);
        return console.log('no timestamp change ---- sending cached canvas buffer');
    }

    getCanvasBlob({width, height})
        .then(blob => {
            console.log(`got canvas blob; length: ${blob.length}`)
            mils('blob success')

            const buffer = Buffer.from(blob, 'binary')
            const timestamp = getCanvasTimeStamp()

            canvasBuffer = buffer;
            bufferTimestamp = timestamp;

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

        let ghost;

        try{
            //get most recent (if more than one, ie when testing) local socket instance
            const gs = await io.in('ghost room').fetchSockets();
            ghost = gs[gs.length - 1]
        }catch(e){
            reject(e);
        }

        //pass acknowledge callback to ghost client
        const ack = (error, blob) => {
            if(error) reject(error);
            else resolve(blob);
        }

        ghost.emit('blob', {width, height}, ack)
    });    

    return blobPromise;
}

function sendCanvasBinary(res, buffer, timestamp){
    res.header('access-control-expose-headers', 'x-timestamp')
    res.header('content-type', 'image/png')
    res.header('content-length', buffer.length)
    res.header('x-timestamp', timestamp)                
    // res.status(200).send(buffer)


    const stream = Readable.from(buffer)

    stream.on('error', e => {
        res.status(500).send('server error')
        stream?.destroy()
        next(e)
    })

    res.status(200);
    stream.pipe(res);
}

// async function saveCanvasToDB(fields){

//     const {timestamp, width, height} = fields;
    
//     try{

//         if(isSaving) throw new Error('save operation already in progress')
//         isSaving = true;

//         const canvas = new Canvas({...fields});

//         await canvas.save();
//         console.log('saved canvas to db');

//         lastSave = timestamp;

//         const id = canvas.id;

//         const results = await Canvas.find({
//                 _id: {$ne: id},
//                 width,
//                 height
//             }, '_id timestamp').exec()

//         console.log(results);
        
//         isSaving = false;

//     }catch(e){
//         console.log(e)
//     }
// }

// setInterval(() => {
//     if(!isSaving && canvasBuffer && lastSave !== bufferTimestamp){
//         saveCanvasToDB({
//             buffer: canvasBuffer,
//             timestamp: bufferTimestamp,
//         })
//     }
// }, 10000)

