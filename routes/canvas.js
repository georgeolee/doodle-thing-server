import express from 'express'
import { Canvas } from '../models/canvas.js'

import { io, getCanvasTimeStamp, getGhostSocket } from '../index.js'

import {Readable} from 'stream'
import mongoose from 'mongoose'

export const router = express.Router()

import {CanvasCache} from '../CanvasCache.js'
import { CanvasDBHandler } from '../CanvasDBHandler.js'

const cache = new CanvasCache();
const canvasDB = new CanvasDBHandler();

const db = mongoose.connection;
//start database processes
db.once('open', async () => {


    //poll for ghost socket
    const ghostPromise = new Promise((resolve, reject) => {    
        const getGhost = async () => {
            try{
                const gs = await getGhostSocket();            
                if(gs) resolve(gs);                
                else setTimeout(getGhost, 100);
            }catch(e){
                reject(e)
            }            
        }            
        getGhost()                  
    }).catch(e => console.log('GP', e));

    //query canvas saves from db
    const canvasPromise = canvasDB.retrieveDBCanvases().catch(e => console.log('CP', e));

    const [ghost, canvases] = await Promise.all([ghostPromise, canvasPromise]);
    
    let toSend = {}

    canvases.forEach(canvas => {
        const size = `${canvas.width}x${canvas.height}`        
        if(!toSend[size] || Number(toSend[size].timestamp) < Number(canvas.timestamp)){
            toSend[size] = canvas;
        }
    })


    //promise for each image load
    const p = []

    for(const size in toSend){            
        const {buffer, width, height} = toSend[size]
        let settlePromise;
        
        const loadImage = new Promise((resolve, reject) => {
            settlePromise = (err, val) => {
                if(err) reject(err);
                else resolve(val);
                console.log('settling ghost canvas promise')
            }

            setTimeout(() => reject('timed out'), 60*1000);
        }).catch(e => console.log('failed to load db canvas in local client',e));

        p.push(loadImage);

        console.log(`IS IT A BUFFER IN NODE? : ----- ${Buffer.isBuffer(buffer)}`)
        
        ghost.emit('load canvas', width, height, buffer, settlePromise)
    }

    //wait for canvases to load db images
    await Promise.allSettled(p);
    
    
    console.log('starting db update loop')
    dbUpdateLoop();
})

//CORS
router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)  
    res.header('access-control-expose-headers', 'x-timestamp, retry-after')  
    console.log(`${req.method}: ${req.originalUrl}`)
    next()
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

    console.log(`canvas req -> has cache entry? ${!!cached}\t | is stale? ${cached?.isStale}`)

    
    if(cached != null && cached.isStale === false){
        sendCanvasBinary(res, cached.buffer, cached.timestamp);
        return console.log('no timestamp change ---- sending cached canvas buffer');
    }


    getCanvasBlob({width, height})
        .then(blob => {
            console.log(Buffer.isBuffer(blob))
            console.log(`got canvas blob; length: ${blob.length}`)
            mils('blob success')

            const buffer = blob;
            // const buffer = Buffer.from(blob, 'binary') socket.io already converts the client blob to node Buffer

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




function wait(mils){
    return new Promise((resolve, ) => {
        setTimeout(resolve, mils);
    })
}


//TODO

//goal -> db timestamp should be up to date (or close)

//atm:
//canvas cache currently only updates on blob request
//as written, db won't get updated if the cache is stale

//should be
    //a) comparing getCanvasTimeStamp() value to db timestamp to decide if update is required, and
    //b) if need to update, check cache freshness to determine whether need to use [cached buffer OR getCanvasBlob] as buffer source for db entry

async function dbUpdateLoop(){
    const sleepTime = 5*60*1000    //10 min interval
    while(true){
        
        await wait(sleepTime)

        console.log('db update in progress..')
        
        try{
            await Promise.allSettled(
                cache
                    .getEntries()
                    .filter(entry => (entry && !entry.isStale))
                    .map(entry => canvasDB.updateDBCanvas(entry))
            )
            console.log('db update done..?')
        }catch(e){
            console.log('db update error', e)
        }
        

    }
}
