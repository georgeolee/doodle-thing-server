import express from 'express'
import { CanvasData } from '../models/canvasData.js'

import { io } from '../index.js'

export const router = express.Router()

//db snapshots to remove, oldest first
const removalQueue = []

//canvas snapshots, oldest first
const recent = []

const localSnapshotCount = 10


router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL)    

    console.log(`${req.method}: ${req.originalUrl}`)

    next()
})


//add query params for requesting specific image size
//get canvas snapshot route
router.get('/', async (req, res) => {
    res.header('Content-Type', 'application/json')
    console.log('received /canvas GET request')


    // io.to('ghost room').emit('canvas request')

    

    //TODO - implement this
    const {width, height} = req.query
    //if width || height .... prefer same dimensions

    //io.to(ghost room).emit doesn't seem to work w/ acknowledge callback
    // so ->
    //get single ghost socket instance (should only be one anyway)
    const ghost = (await io.in('ghost room').fetchSockets())[0]


    //TODO - timeout & error handling
    const ack = (err, data) => {
        if(data && data.dataURL && data.width && data.height){
            res.status(200).json(data)
        }else{
            res.status(500).send('problem fetching canvas data')
        }
    }

    ghost.emit('canvas request', {width, height}, ack)

    // const sendCanvasJSON = data => {
    //     try{
    //         res.status(200).json(data)
    //         console.log('sent canvas data')
    //     }catch(e){
    //         res.status(500).send('there was a problem retrieving canvas data')
    //         console.log('error retrieving canvas data')
    //         console.log(e)
    //     }
    // }

    // io.once(`canvas ${width}x${height}`, )

    // io.on

    // io.once('one-off', () => console.log(`RANDO ${Math.round(Math.random() * 100)}`))


    // res.status(202).send()

    // const snapshot = recent.length ? {...recent[recent.length - 1]} : {'empty': true}

    // res.json(snapshot)
    // console.log('sent json ?')
})

