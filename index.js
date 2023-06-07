const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;


// middle ware
app.use(cors());
app.use(express.json());




app.get('/', (req, res) => {
    res.send('Summer Camp is Running')
})

app.listen(port, () => {
    console.log(`Summer Camp is Running ${port}`)
})