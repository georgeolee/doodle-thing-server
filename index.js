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

//parse JSON request bodies
app.use(express.json({
    limit: '1mb',
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
const io = new Server(server, {
    cors:{
        origin: process.env.CLIENT_URL,
    }
})



server.listen(process.env.PORT, () => {
    console.log(`listening at ${server.address().address}:${server.address().port}`)

    //open up the headless client for canvas tracing
    startGhost()
})


//socket.io stuff

// setInterval(async ()=>{    
//     console.log('interval')
//     const c = await io.allSockets()

//     for(const id of c){
//         console.log(id)
//         console.log(`requesting client canvas data from socket id ${id}`)
//         io.to(id).emit('request canvas data')
//         break
//     }
    
// }, 10000)

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

        //send to clients & ghost client
    })

    socket.on('ghost', says => {
        console.log(says)
    })

    socket.on('ping', () => {
        console.log(`ping from socket id ${socket.id}`)
        io.to(socket.id).emit('pong')        
    })

    // socket.on('cdata', data => {
    //     console.log(data)
    // })
});

setInterval(()=>{
    io.emit('download', {width:300,height:300})
}, 10000)


async function startGhost(){
    const url = `http://localhost:${process.env.PORT}/ghost`

    console.log(url)
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.goto(url)
}