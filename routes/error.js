import express from 'express'

export const router = express.Router();

router.use(express.json({
    type: '*/*'
}))

router.use((req, res, next) => {
    res.header('access-control-allow-origin', process.env.CLIENT_URL)
    next()
})

router.post('/', (req, res) => {
    try{
        const json = req.body;
        

        console.log('\n\nerror from client')
        console.log(json,'\n\n')

        res.status(200).send();
    }catch(e){
        res.status(500).send();
    }    
})