import express from 'express'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import http from 'http'
import puppeteer from 'puppeteer'

//start canvas processes
import {
    timestamp,
    loadCanvasImages, 
    startCanvasSaveLoop,
} from './canvas.js'

import { initSizeMap } from './sizes.js'

// import * as path from 'path'

//__dirname & __filename fix for es module syntax
// import url from 'url'
// const __filename = url.fileURLToPath(import.meta.url)
// const __dirname = url.fileURLToPath(new URL('.', import.meta.url))


import { User } from './users.js'


//config env variables (dev only)
if(process.env.NODE_ENV !== 'production') await import('dotenv').then(dotenv => dotenv.config())

initSizeMap()

//connect to mongodb
mongoose.connect(process.env.DATABASE_URL)
const db = mongoose.connection
db.on('error', error => console.error(error))


db.once('open', async () => {
    console.log('connected to mongodb')

    try{
        await loadCanvasImages();
        startCanvasSaveLoop(process.env.DB_UPDATE_INTERVAL_MILLIS);
    }catch(e){
        console.error(e)
    }
})


const app = express()

//parse JSON request bodies
// app.use(express.json({limit: '100kb', type: '*/*'}))

app.set('view engine', 'pug')

//express routes
import { router as indexRouter } from './routes/index.js'
import { router as canvasRouter } from './routes/canvas.js'
import { router as ghostRouter } from './routes/ghost.js'
import { router as errorRouter } from './routes/error.js' //client error reporting

app.use('/', indexRouter)
app.use('/canvas', canvasRouter)
app.use('/ghost', ghostRouter)
app.use('/error', errorRouter)

//HTTP server
const server = http.createServer(app)

//socket.io server
export const io = new Server(server, {
    cors:{
        origin: process.env.CLIENT_URL,
    },
    maxHttpBufferSize: 1e7 //increase buffer size for transmitting big png images from puppeteer client over socket connection
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

    //SEND NEW USER CURRENT CLIENT LIST
    const users = User.getUserList()
    io.to(socket.id).emit('user', users)


    //TODO - send updated user list on reconnect

    socket.on('disconnect', () => {
        console.log(`socket disconnected ----- socket id: ${socket?.id}`)        


        //check if there was a user registered to the socket
        const disconnectedUser = User.delete(socket); //<- stop tracking disconnected user status        

        if(disconnectedUser){
            console.log(`user id ${disconnectedUser.id} disconnected`)
            io.to('user room').emit('user', [{id:disconnectedUser.id, disconnect: true}]) // <- wrap user in array
        }

        socket.removeAllListeners()
    })


    socket.on('click', date => {
        console.log(`click from ${socket.id}: ${date}`)

        getGhostSocket()
            .then(ghost => io.to(ghost.id).emit('download', {width:900,height:900}))
            .catch()
    })


    //broadcast drawing data to fellow clients & ghost client
    socket.on('drawingData', data => {
        socket.broadcast.emit('drawingData', data)        
    })

    //puppeteer client connect
    socket.on('ghost', says => {
        console.log(says)

        socket.join('ghost room')

        //timestamp update from puppeteer client
        socket.on('timestamp', ts => {
            timestamp.set(ts)
        })
        
    })

    //user data update from client
    socket.on('user', (userData) => {

        console.log(userData)

        //update user representation on the server
        const user = User.set(socket, userData); // <- track user status

        console.log('\n\nCOLOR')
        console.log(user.data.color)

        //user didn't include a session id (ie, new user connecting) –> send assign id to user
        if(!userData.id){
            io.to(socket.id).emit('assign id', user.id); //assign an id to the client            
        }

        //broadcast user status
        socket.broadcast.except('ghost room').emit('user', [user.data])

        socket.join('user room')
    })

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

