import express from 'express'
export const router = express.Router()

router.get('/', (req, res) => {

    console.log('GHOSTY')
    res.status(200).send('getttttt')
})