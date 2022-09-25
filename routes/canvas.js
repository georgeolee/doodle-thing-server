import express from 'express'
import { CanvasData } from '../models/canvasData.js'

export const router = express()

router.post('/', async (req, res) => {
    req.header('Access-Control-Allow-Origin', process.env.CLIENT_URL) //allow posting canvas data from client 
    console.log(req.body)
    // console.log(Object.keys(req.body))

    res.status = 200

    try {
        const snapshot = new CanvasData({...req.body})

        await snapshot.save()
        console.log('saved canvas snapshot')
    } catch (error) {
        console.log(error)
    }
})