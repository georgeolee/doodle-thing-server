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

router.get('/timestamp', (req, res) => {
    const ts = getCanvasTimeStamp()
    res.header('access-control-expose-headers', 'x-timestamp')
    res.header('content-type', 'text/plain')
    res.header('x-timestamp', ts)
    res.status(200).send(ts)
})

//HERE AND IN CANVAS.JSX

//some kind of timestamp or hash 

//some way to avoid render loop

router.get('/', async (req, res) => {
    
    const {width, height} = req.query
    
    const gs = await io.in('ghost room').fetchSockets()
    const ghost = gs[gs.length - 1]

    console.log('blob get')

    //TODO
    // if(canvasBuffer && bufferTimestamp === getCanvasTimeStamp()){
    //      clean buffer -> send cached version instead of pinging ghost
    // }

    //TODO - timeout & error handling
    const ack = (err, data) => {
        console.log('blob ack')
        
        if(err){
            console.log(err)            
            
            res.status(500).send(`error fetching blob; | ${err.name}: ${err.message}`)
        }else{
            
            res.header('access-control-expose-headers', 'x-timestamp')
            res.header('content-type', 'image/png')
            res.header('x-timestamp', getCanvasTimeStamp())

            console.log(res.getHeaders())
            
            res.status(200).send(Buffer.from(data, 'binary'))
        }
    }

    
    ghost.emit('blob', {width, height}, ack)
    console.log('blob emit')
})

// //add query params for requesting specific image size
// //get canvas snapshot route
// router.get('/', async (req, res) => {
//     res.setHeader('Content-Type', 'application/json')    

//     console.log('received /canvas GET request')


//     // io.to('ghost room').emit('canvas request')

    

//     //TODO - implement this
//     const {width, height} = req.query
//     //if width || height .... prefer same dimensions

//     //io.to(ghost room).emit doesn't seem to work w/ acknowledge callback
//     // so ->
//     //get single ghost socket instance 
//     //should only be 1 in production, but this grabs newest if opening in browser window for testing
//     const gs = await io.in('ghost room').fetchSockets()
//     const ghost = gs[gs.length - 1]


//     //TODO - timeout & error handling
//     const ack = (err, data) => {
//         if(data && data.dataURL && data.width && data.height){
//             res.status(200).json(data)
//         }else{
//             res.status(500).send('problem fetching canvas data')
//         }
//     }

//     ghost.emit('canvas request', {width, height}, ack)


// })

