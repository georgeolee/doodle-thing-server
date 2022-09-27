import express from 'express'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import http from 'http'
import * as path from 'path'
import bodyParser from 'body-parser'

import puppeteer from 'puppeteer'

//dotenv import & config – skip for production version
if(process.env.NODE_ENV !== 'production'){
    await import('dotenv').then(dotenv => { 
        dotenv.config()        
    })
}

//MONGODB
import {CanvasData} from './models/canvasData.js'

//connect to mongodb
mongoose.connect(process.env.DATABASE_URL)
const db = mongoose.connection
db.on('error', error => console.log(error))
db.once('open', () => console.log('connected to mongodb'))




const app = express()
app.use(bodyParser.json({
    limit:'1mb',
    type: '*/*'
}))

//express routes
import { router as indexRouter } from './routes/index.js'
import { router as canvasRouter } from './routes/canvas.js'
import { router as ghostRouter } from './routes/ghost.js'

app.use('/', indexRouter)
app.use('/canvas', canvasRouter)
app.use('/ghost', ghostRouter)


const server = http.createServer(app)

const io = new Server(server, {
    cors:{
        origin: process.env.CLIENT_URL,
    }
})



server.listen(process.env.PORT, () => {
    console.log(`listening at ${server.address().address}:${server.address().port}`)
    
    startGhost()
})


//socket.io stuff

setInterval(async ()=>{    
    console.log('interval')
    const c = await io.allSockets()

    for(const id of c){
        console.log(id)
        console.log(`requesting client canvas data from socket id ${id}`)
        io.to(id).emit('request canvas data')
        break
    }
    
}, 10000)

io.on('connection', socket => {

    console.log(`new socket connection ----- id: ${socket.id}`)
    
    io.to(socket.id).emit('confirmation')

    socket.on('disconnect', () => {
        console.log(`socket disconnected ----- id: ${socket?.id}`)
        socket.removeAllListeners()
    })

    socket.on('message', msg => {
        console.log(msg)
    })

    socket.on('click', date => {
        console.log(`click from ${socket.id}: ${date}`)
    })

    

    socket.on('pointerState', data => {
        socket.broadcast.emit('pointerState', data)

        // doodler.consumePointerStates(JSON.parse(data))
    })

    // setTimeout(() => {
    //     io.to(socket.id).emit('request canvas data')
    // }, 4000)
});

async function startGhost(){
    const url = `http://localhost:${process.env.PORT}/ghost`

    console.log(url)
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.goto(url)
}