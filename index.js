const express = require("express");
const cors = require("cors");

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_API_KEY);
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

function verifyJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    res.status(403).send("forbidden access");
  }
  const token = auth.split(" ")[1];
  jwt.verify(token, process.env.JWT_ACCESS_TOKEN, function (error, decoded) {
    if (error) {
      res.status(401).send("unauthorized access");
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const productsCollection = client
      .db("recycle-laptop")
      .collection("products");
    const categoryCollection = client
      .db("recycle-laptop")
      .collection("categories");
    const usersCollection = client.db("recycle-laptop").collection("users");
    const soldProductsCollection = client
      .db("recycle-laptop")
      .collection("soldProducts");
    const wishlistCollection = client
      .db("recycle-laptop")
      .collection("wishlistProducts");
    const reportedProductsCollection = client
      .db("recycle-laptop")
      .collection("reportedProducts");
    const bookedProductCollection = client
      .db("recycle-laptop")
      .collection("bookedProducts");
///verify admin role
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { user_email: email };
      const adminEmail = await usersCollection.findOne(query);
      if (adminEmail?.user_role !== "admin") {
        return res.status(403).send("forbidden access");
      }
      next();
    };
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
        saleStatus: "unsold",
      };
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });
    //get seller product
    app.get("/products",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
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
    app.delete("/product/delete/:id",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
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
    //update report product status
    app.post("/report-product", async (req, res) => {
      const data = req.body;
      const result = await reportedProductsCollection.insertOne(data);
      res.send(result);
    });
    //add product wishlist
    app.post("/wishlist-product", async (req, res) => {
      const data = req.body;
      const result = await wishlistCollection.insertOne(data);
      res.send(result);
    });
    //store sold product
    app.post("/sold-product", async (req, res) => {
      const data = req.body;
      const result = await soldProductsCollection.insertOne(data);
      res.send(result);
    });
    //update sold product status
    app.put("/booked-product/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          saleStatus: "booked",
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
      const query = { categoryId: id, saleStatus: "unsold" };
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
    app.get("/user",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
      const query = {
        user_email: email,
      };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //get all buyer
    app.get("/all-buyer", async (req, res) => {
      const query = { user_role: "buyer" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    //delete a buyer
    app.delete("/all-buyer/:id",verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    //get all seller
    app.get("/all-seller", async (req, res) => {
      const query = { user_role: "seller" };
      const result = await usersCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };
      const user = usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.JWT_ACCESS_TOKEN, {
          expiresIn: "1d",
        });
        return res.send({ accessToken: token });
      }
      res.status(401).send("unauthorized access");
    });
    //get all reported products
    app.get("/reported-products", async (req, res) => {
      const query = {};
      const result = await reportedProductsCollection.find(query).toArray();
      res.send(result);
    });
    //get all wishlist product
    app.get("/my-wishlist",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
      const query = { user_email: email };
      const wishlist = await wishlistCollection.find(query).toArray();
      res.send(wishlist);
    });
    //get all products
    app.get("/all-products", async (req, res) => {
      const query = { saleStatus: "unsold" };

      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    //payment intent

    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: price,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    //store booked product
    app.post("/my-orders", async (req, res) => {
      const data = req.body;
      const result = await bookedProductCollection.insertOne(data);
      res.send(result);
    });

    //update wishlist sold status
    app.put("/wishlistsProducts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          saleStatus: "sold",
        },
      };
      const result = await wishlistCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    ///get my orders
    app.get("/my-orders",verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
      const query = { customerEmail: email };
      const result = await bookedProductCollection.find(query).toArray();
      res.send(result);
    });

    //remove item from booked
    app.delete("/remove-from-cart/:id", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await bookedProductCollection.deleteOne(filter);
      res.send(result);
    });
    //remove from wishlist
    app.delete("/remove-from-wishlist/:id", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const verifyEmail = req.decoded.email;
      if (verifyEmail !== email) {
        return res.status(401).send("unauthorized access");
      }
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await wishlistCollection.deleteOne(filter);
      res.send(result);
    });
    //get product for payment
    app.get("/payment/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });
    //sold product status changed
    app.put("/soldProducts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          saleStatus: "sold",
        },
      };
      const result = await productsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    //update booked product collection sold status
    app.put("/bookedProducts/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          saleStatus: "sold",
        },
      };
      const result = await bookedProductCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
    ///delete from report collection
    app.delete("/delete-report/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reportedProductsCollection.deleteOne(query);
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
