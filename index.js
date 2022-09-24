import express from 'express'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import 'socket.io'
import { Server } from 'socket.io'

if(process.env.NODE_ENV !== 'production'){
    dotenv.config()
}

const app = express()
const server = app.listen(process.env.PORT)
const io = new Server(server, {
    cors:{
        // origin: process.env.CLIENT_URL,
        origin: true,
        methods: ['GET', 'POST']
    }
})

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



// io.on('message', msg => console.log('msg'))

// app.get()