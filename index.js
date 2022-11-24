const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app=express();
const port=process.env.PORT || 5000;


app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster1.rvqsrsr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run(){
    try {
        const productsCollection=client.db('recycle-laptop').collection('products');
        const categoryCollection=client.db('recycle-laptop').collection('categories');

        //get all categories
        app.get('/categories', async(req, res)=>{
            const query={};
            const categories=await categoryCollection.find(query).toArray();
            res.send(categories)
        });

        //get a single categories
        app.get('/single_category/:id', async(req, res)=>{
            const id=parseInt(req.params.id);
            const query={categoryId:id};
            const cursor=await productsCollection.find(query).toArray();
            res.send(cursor)
        })
    } catch (error) {
        console.log(error);
    }

}
run().catch(error=>console.log(error))

app.get('/', (req, res)=>{
    res.send('Server is live now.')
})
app.listen(port, ()=>{
    console.log(`Server is running in ${port} port.`)
})