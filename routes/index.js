import express from 'express'

export const router = express()


router.get('/', (req, res) => {
    res.send(`server up and running; go to ${process.env.CLIENT_URL} for client app`)
})
