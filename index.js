import express from 'express'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import http from 'http'
import puppeteer from 'puppeteer'

// import * as path from 'path'

//__dirname & __filename fix for es module syntax
// import url from 'url'
// const __filename = url.fileURLToPath(import.meta.url)
// const __dirname = url.fileURLToPath(new URL('.', import.meta.url))


export const snapShots = {}

let timestamp = Date.now().toString();



export function getCanvasTimeStamp(){
    return timestamp
}



//dotenv import & config – skip for production version
if(process.env.NODE_ENV !== 'production'){
    await import('dotenv').then(dotenv => { 
        dotenv.config()        
    })
}

//MONGODB
import {Canvas} from './models/canvas.js'

//connect to mongodb
mongoose.connect(process.env.DATABASE_URL)
const db = mongoose.connection
db.on('error', error => console.log(error))
db.once('open', () => console.log('connected to mongodb'))


const app = express()

//parse JSON request bodies
app.use(express.json({
    limit: '100kb',
    type: '*/*'
}))

app.set('view engine', 'pug')

//express routes
import { router as indexRouter } from './routes/index.js'
import { router as canvasRouter } from './routes/canvas.js'
import { router as ghostRouter } from './routes/ghost.js'

app.use('/', indexRouter)
app.use('/canvas', canvasRouter)
app.use('/ghost', ghostRouter)


//HTTP server
const server = http.createServer(app)

//socket.io server
export const io = new Server(server, {
    cors:{
        origin: process.env.CLIENT_URL,
    },
    maxHttpBufferSize: 1e7
})

//ghost client socket instance, or null
export async function getGhostSocket(){    
    const sockets = await io.in('ghost room').fetchSockets()    
    return (sockets.length > 0) ? sockets[sockets.length - 1] : null  
}


server.listen(process.env.PORT, () => {
    console.log(`listening at ${server.address().address}:${server.address().port}`)

    //open up the headless client for canvas tracing
    startGhost()
})

//set socket listeners
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

        getGhostSocket()
            .then(ghost => io.to(ghost.id).emit('download', {width:900,height:900}))
            .catch()
    })


    socket.on('drawingData', data => {
        socket.broadcast.emit('drawingData', data)

        //send to clients & ghost client
    })

    //puppeteer client connect
    socket.on('ghost', says => {
        console.log(says)

        socket.join('ghost room')

        //timestamp update from puppeteer client
        socket.on('timestamp', ts => {
            timestamp = ts
        })
        
    })

    // //client connect
    // socket.on('user', () => {
    //     socket.join('user room')
    // })

    socket.on('ping', () => {
        console.log(`ping from socket id ${socket.id}`)
        io.to(socket.id).emit('pong')        
    })


});


async function startGhost(){
    const url = `http://localhost:${process.env.PORT}/ghost`

    console.log(url)
    const browser = await puppeteer.launch({ args: ['--no-sandbox'], dumpio: process.env.PUPPETEER_LOG })
    const page = await browser.newPage()
    await page.goto(url)

    // IMAGE DOWNLOAD TEST
    const client = await page.target().createCDPSession()
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: './puppeteer/downloads'
    })
}