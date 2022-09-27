import express from 'express'
import { CanvasData } from '../models/canvasData.js'

export const router = express.Router()

//db snapshots to remove, oldest first
const removalQueue = []

//canvas snapshots, oldest first
const recent = []

const localSnapshotCount = 10

getRecentSnapshots(localSnapshotCount).then(results => {
    recent.push(...results)
    console.log(`retrieved ${results.length} snapshots from db`)
})

router.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL)    

    console.log(`${req.method}: ${req.originalUrl}`)

    next()
})


//add query params for requesting specific image size
//get canvas snapshot route
router.get('/', (req, res) => {
    res.header('Content-Type', 'application/json')
    console.log('received /canvas GET request')


    const {width, height} = req.query
    //if width || height .... prefer same dimensions

    const snapshot = recent.length ? {...recent[recent.length - 1]} : {'empty': true}

    res.json(snapshot)
    console.log('sent json ?')
})


//Clean this up

//post canvas snapshot route
router.post('/', async (req, res) => {

    try {

        const snapshot = new CanvasData({...req.body})

        const doc = await snapshot.save()
        res.status(200).send()

        if(doc.dataURL){
            console.log('saved: ')
            console.log(doc.dataURL.substring(0,25))
        }else{
            console.log('didn\'t save?')
        }

        if(recent.length >= localSnapshotCount){
            recent.shift()
        }
        recent.push({...req.body})

        console.log('saved canvas snapshot')




        const results = await CanvasData.find({})
        console.log(`found ${results.length} snapshots after saving`)


        //todo - hysteresis -> bump up max count & prune more than 1 when max exceeded (cut down on queries/sorting)
        if(results.length >= process.env.CANVAS_SNAPSHOT_COUNT){
            const numToRemove = results.length - process.env.CANVAS_SNAPSHOT_COUNT + 10
            
            console.log(`removing ${numToRemove} oldest snapshots after saving`)

            const start = performance.now()
            for(let n = 0; n < numToRemove; n++){
                // await removeOldestSnapshot(results)
                removeOldestSnapshot(results)
            }
            const dur = performance.now() - start

            console.log(`removal duration: ${dur}`)
            
        }

        
    } catch (error) {
        console.log(error)
    }
})


async function removeOldestSnapshot(queryResults){
    const start = performance.now()
    try{
        //empty removal queue?
        if(removalQueue.length === 0){

            console.log('nothing in queue; querying db for snapshots...')
            
            //no results found -> nothing to delete
            if(!queryResults || queryResults.length === 0){
                console.log('nothing found in db; proceeding w/o removing anything')
                return
            }

            //sort by timestamp, oldest first
            queryResults.sort((a, b) => a.timestamp - b.timestamp)

            //add all to removal queue
            removalQueue.push(...queryResults)
            
        }

        //get oldest snapshot
        const oldest = removalQueue.shift()

        console.log('A')
        await oldest.deleteOne()
                    .then(()=>console.log('removed snapshot'))
                    .catch(err => {
                        console.log(e)
                        if(!oldest.$isDeleted){
                            removalQueue.unshift(oldest) //put back
                        }
                    })
        console.log('B')

    }catch(e){
        console.log(e)
    }

    console.log(`total removal execution: ${performance.now() - start}`)
}

// query db for recent canvas snapshots on server startup
async function getRecentSnapshots(count){
    try{
        const results = await CanvasData.find({}).sort({timestamp:'ascending'}).exec()
        
        if(!results || !results.length) return []; //nothing found

        return results.slice(-1 * Math.min(results.length, count), results.length)

    }catch(e){
        console.log(e)
    }    
}