import express from 'express'
import mongoose from 'mongoose'
import { Server } from 'socket.io'
import http from 'http'


//dotenv import & config – skip for production version
if(process.env.NODE_ENV !== 'production'){
    await import('dotenv').then(dotenv => { dotenv.config()})
}


const app = express()

const server = http.createServer(app)

const io = new Server(server, {
    cors:{
        origin: process.env.CLIENT_URL,
    }
})

//express routes

import { router as indexRouter } from './routes/index.js'
app.use('/', indexRouter)


server.listen(process.env.PORT, () => {
    console.log(`listening at ${server.address().address}:${server.address().port}`)
})


//socket.io stuff

io.on('connection', socket => {

    console.log(`new socket connection ----- id: ${socket.id}`)
    
    io.to(socket.id).emit('confirmation')

    socket.on('disconnect', () => {
        console.log(`socket disconnected ----- id: ${socket?.id}`)
    })

    socket.on('message', msg => {
        console.log(msg)
    })

    socket.on('click', date => {
        console.log(`click from ${socket.id}: ${date}`)
    })

    socket.on('pointerState', data => {
        socket.broadcast.emit('pointerState', data)
    })
})

