import express from 'express'
import { CanvasData } from '../models/canvasData.js'

import { io, getCanvasTimeStamp } from '../index.js'

export const router = express.Router()

let canvasBuffer = null
let bufferTimestamp = null

//CORS
router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)    
    console.log(`${req.method}: ${req.originalUrl}`)
    next()
})


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
    
    // const {width, height} = req.query
    const {width, height} = {width: 300, height: 300}
    

    //cached buffer is up to date
    if(bufferTimestamp === getCanvasTimeStamp() && canvasBuffer){
        sendCanvasBinary(res, canvasBuffer, bufferTimestamp);
        return console.log('no timestamp change ---- sending cached canvas buffer');
    }


    //get latest ghost socket instance (should only be 1 running on puppeteer unless debugging locally in browser window)
    const gs = await io.in('ghost room').fetchSockets()
    const ghost = gs[gs.length - 1]

    console.log('blob get')

    //TODO - timeout & error handling
    const ack = (err, data) => {
        console.log('blob ack')
        
        if(err){
            console.log(err)            
            
            res.status(500).send(`error fetching blob; | ${err.name}: ${err.message}`)
        }else{
            
            const timestamp = getCanvasTimeStamp()
            const buffer = Buffer.from(data, 'binary')

            sendCanvasBinary(res, buffer, timestamp)


            canvasBuffer = buffer;
            bufferTimestamp = timestamp;
        }
    }

    
    ghost.emit('blob', {width, height}, ack)
    console.log('blob emit')
})


function sendCanvasBinary(res, buffer, timestamp){
    res.header('access-control-expose-headers', 'x-timestamp')
    res.header('content-type', 'image/png')
    res.header('x-timestamp', timestamp)                
    res.status(200).send(buffer)
}