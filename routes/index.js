import express from 'express'

export const router = express.Router()


router.get('/', (req, res) => {
    res.send(`server up and running; go to <a href=${process.env.CLIENT_URL}>${process.env.CLIENT_URL}</a> for client app`)
})




