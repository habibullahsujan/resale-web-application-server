const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASSWORD}@cluster1.rvqsrsr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productsCollection = client
      .db("recycle-laptop")
      .collection("products");
    const categoryCollection = client
      .db("recycle-laptop")
      .collection("categories");
    const usersCollection = client.db("recycle-laptop").collection("users");

    //store new product info
    app.post("/product", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    //get advertised products
    app.get("/advertised/products", async (req, res) => {
      const query = {
        isAdvertised: true,
      };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    //get seller product
    app.get("/products", async (req, res) => {
      const email = req.query.email;
      let query;
      if (email) {
        query = {
          sellerEmail: email,
        };
      }
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    //delete a product
    app.delete("/product/delete/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });
    //get a single product to set it is advertised by seller
    app.put("/advertised/product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          isAdvertised: true,
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    //get all categories
    app.get("/categories", async (req, res) => {
      const query = {};
      const categories = await categoryCollection.find(query).toArray();
      res.send(categories);
    });

    //get a single categories
    app.get("/single_category/:id", async (req, res) => {
      const id = parseInt(req.params.id);
      const query = { categoryId: id };
      const cursor = await productsCollection.find(query).toArray();
      res.send(cursor);
    });
    //store user info in the database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    //get a user info
    app.get("/user", async (req, res) => {
      const email = req.query.email;
      const query = {
        user_email: email,
      };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });
  } catch (error) {
    console.log(error);
  }
}
run().catch((error) => console.log(error));

app.get("/", (req, res) => {
  res.send("Server is live now.");
});
app.listen(port, () => {
  console.log(`Server is running in ${port} port.`);
});
