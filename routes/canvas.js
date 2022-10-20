import express from 'express'


import { getGhostSocket } from '../index.js'

import {Readable} from 'stream'

import { getCanvasBuffer, isLoadingFinished } from '../canvas.js'

export const router = express.Router()

import PngQuant from 'pngquant'

import {timestamp} from '../canvas.js'

//CORS
router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)  
    res.header('access-control-expose-headers', 'x-timestamp, retry-after, x-uncompressed-length')  
    console.log(`${req.method}: ${req.originalUrl}`)
    next()
})




//canvas timestamp - clients can compare to see if canvas update is necessary
router.get('/timestamp', (req, res) => {

    const ts = timestamp.string
    res.header('content-type', 'text/plain')
    res.header('x-timestamp', ts)
    res.status(200).send(ts)
})

//check ghost availability in case the dyno is just waking up
router.use('/', async (req, res, next) => {
    const ghost = await getGhostSocket()
    
    if(ghost != null && isLoadingFinished()){
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

    //get query params
    const {width = 300, height = 300} = req.query
    
    try{

        const {buffer, timestamp} = await getCanvasBuffer({width, height})
        console.log(`got canvas blob; length: ${buffer.length}`)

        //stream compressed canvas image to client
        sendCanvasBinary(res, buffer, timestamp);

    }catch(e){
        console.log('error getting blob:')
        console.error(e)
        res.status(500).send('server error getting canvas data')
    }

})


function sendCanvasBinary(res, buffer, timestamp){
    res.header('content-type', 'image/png')
    res.header('x-timestamp', timestamp)                

    //for sending compressed stream - send uncompressed length so client has an upper bounds for buffer size
    res.header('x-uncompressed-length', buffer.length)

    const stream = Readable.from(buffer)

    stream.on('date', data => console.log(`on data in ${data.length} bytes`))

    stream.on('close', () => {
        console.log(`sendCanvasBinary: stream closed`);
    })

    stream.on('error', e => {
        res.status(500).send('server error')
        stream?.destroy()
        next(e)
    })

    //stream uncompressed
    // res.status(200)
    // stream.pipe(res);

    //compress w/ pngquant 
    const pq = new PngQuant([128, '--speed', 11, '-']); //128 colors, speed 11, pipe i/o

    pq.on('error', e => {
        console.log('pq error', e)
        res.status(500).send('server error')
        pq?.destroy()
        next(e)
    })

    res.status(200)

    stream.pipe(pq).pipe(res) 
}