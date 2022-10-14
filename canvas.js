/**
 * canvas data send / get from puppeteer client, cache, mongodb
 * 
 */


import { CanvasCache } from "./CanvasCache.js";
import { CanvasDB } from "./CanvasDB.js";
import { Timestamp } from "./Timestamp.js";
import { getGhostSocket } from "./index.js";
import { sizeMap } from "./sizes.js";

/** timestamp representing the most recent canvas edit among all clients. has string and number getters, and a single setter */
export const timestamp = new Timestamp();

/** interface for canvas database interaction - saving, reading, tracking timestamps */
export const db = new CanvasDB();

/** cache containing the most recent requested buffer and corresponding timestamp ; has a separate entry for each size */
const cache = new CanvasCache();


let loopController = null;

let loadingFinished = false;

/**return true if finished (either successfully or unsuccessfully) loading canvases from db */
export const isLoadingFinished = () => loadingFinished;

/**
 * get canvas buffer and timestamp from cache (if cache timestamp is fresh) or puppeteer client (if cache is stale or empty)
 * @param {{width:string,height:string}} dimensions width & height of the canvas to get
 * @returns {Promise<{buffer:Buffer,timestamp:string}>}
 */
export async function getCanvasBuffer(dimensions){    

    //request specific dimensions or default
    const {width, height} = dimensions;

    //resolve to cached buffer if available & fresh
    const cached = cache.getEntry(width, height);
    if(cached != null && !cached.isStale){        
        
        return {
            buffer:cached.buffer,
            timestamp:cached.timestamp
        }
    }
    

    //otherwise, get buffer from ghost client

    const ghost = await getGhostSocket();

    return new Promise((resolve, reject) => {         
        
        //pass acknowledge callback to ghost socket
        const ack = (error, buffer) => {
            if(error) reject(error);
            else{    

                //update the cached values
                cache.setEntry({
                    buffer, 
                    width, 
                    height, 
                    timestamp: timestamp.string});

                //resolve to buffer from local client
                resolve({
                    buffer,
                    timestamp: timestamp.string});
            }
        }

        ghost.emit('blob', {width, height}, ack)
    });  

}

function wait(mils){
    return new Promise(resolve => {
        setTimeout(resolve, mils)
    })
}

/**
 * starts an async loop that updates the database periodically with any canvas changes
 * @param {number} intervalMillis ms interval between update cycles (min value 60000)
 * @returns an AbortController that stops the update loop
 */
export function startCanvasSaveLoop(intervalMillis){

    loopController?.abort('restarting update loop')//kill the previous update loop if there is one

    const MIN_INTERVAL = 1000*60;
    const interval = Number(intervalMillis) || 1000*60*15

    if(isNaN(interval)) throw new TypeError('dbUpdateLoopStart(): expected type Number for args[0]')
    if(interval < MIN_INTERVAL) throw new RangeError(`dbUpdateLoopStart(): args[0] (${intervalMillis}) less than minimum allowed interval (${MIN_INTERVAL})`)


    loopController = new AbortController()    
    const {signal} = loopController

    signal.onabort = () => console.log(signal.reason)    
    

    async function updateLoop(){
        await wait(interval)

        if(signal.aborted) return

        console.log('db update in progress..')
        await saveAllCanvases()

        updateLoop()
    }

    updateLoop()

    return loopController
}

/**
 * save the current canvas buffers to mongodb if they've changed
 */
async function saveAllCanvases(){
    try{
        const updates = []

        const currentTimestamp = timestamp.string

        //iterate through width & height
        for(const [width, heightArray] of sizeMap){ 
            for(const height of heightArray){

                //skip canvas if nothing changed since last db update
                if(db.getDBTimestampForSize(width, height) === currentTimestamp) continue


                //promise that settles when db update succeeds or fails
                const p = getCanvasBuffer({width, height})
                    .then(({buffer,timestamp}) => db.updateDBCanvas({width, height, buffer, timestamp}))
                    .catch(e => console.error(e))
                updates.push(p)
                console.log(`pushing canvas db update\t|\tsize: ${width} x ${height}`)
            }
        }

        await Promise.allSettled(updates);
        console.log('db update settled')
    }catch(e){
        console.error(e)
    }
}

/**
 * preload server-side canvases with saved images from mongodb
 */
export async function loadCanvasImages(){


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
    }).catch(e => console.error(e));

    //query canvas saves from db
    const canvasPromise = db.getDBCanvases().catch(e => console.error(e));

    const [ghost, canvases] = await Promise.all([ghostPromise, canvasPromise]);
    
    let toSend = {}

    canvases.forEach(canvas => {
        const size = `${canvas.width}x${canvas.height}`        
        if(!toSend[size] || Number(toSend[size].timestamp) < Number(canvas.timestamp)){
            toSend[size] = canvas;
        }
    })


    //promise for each canvas image load on ghost client
    const p = [];
    const timeoutMillis = 60*1000;

    for(const size in toSend){            
        const {buffer, width, height} = toSend[size]

        //ack callback that settles the promise when the image succeeds or fails to load
        let settlePromise;
        
        const loadImage = new Promise((resolve, reject) => {
            settlePromise = (err, val) => {
                if(err) reject(err);
                else resolve(val);
                console.log('loadCanvasImages(): settling ghost canvas promise')
            }

            setTimeout(() => reject(new Error('loadCanvasImages(): timed out while loading canvas')), timeoutMillis);
        }).catch(e => console.error(e));

        p.push(loadImage);
        
        //send canvas data & ack to client socket
        ghost.emit('load canvas', width, height, buffer, settlePromise)
    }

    //wait til all loading succeeds or fails
    await Promise.allSettled(p);
    loadingFinished = true;
    console.log('loadCanvasImages(): finished loading canvas images')
}