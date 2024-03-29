const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


// middle ware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    });
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5jtl7ky.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        // JWT API
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
            res.send({ token });
        })

        // Admin Verify
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }

        // Admin Verify
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }
            next()
        }


        const classesCollection = client.db("SummerCampDb").collection("classes");
        const instructorsCollection = client.db("SummerCampDb").collection("instructors");
        const usersCollection = client.db("SummerCampDb").collection("users");
        const bookingCollection = client.db("SummerCampDb").collection("booking");
        const paymentCollection = client.db("SummerCampDb").collection("payments");
        const instructorsClassesCollection = client.db("SummerCampDb").collection("instructorsClasses");




        // users API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: `${user.name} already exists database` });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        })

        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find({}).toArray();
            res.send(result);
        })

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === 'admin' };
            res.send(result)
        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const user = await usersCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' };
            res.send(result)
        })



        // booking API
        app.post("/booking", async (req, res) => {
            const item = req.body;
            const bookingInsertResult = await bookingCollection.insertOne(item);
            res.send(bookingInsertResult)
        });

        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([]);
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await bookingCollection.find(query).toArray();
            res.send(result)
        })

        app.delete('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/booking/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.findOne(query);
            res.send(result);
        })



        // classes page API
        app.get('/classes', async (req, res) => {
            const result = await classesCollection.find().toArray();
            res.send(result)
        })

        app.post('/classes', verifyJWT, verifyInstructor, async (req, res) => {
            const classes = req.body;
            const result = await classesCollection.insertOne(classes);
            res.send(result);
        });



        // instructor class API
        app.post('/instructorsClasses', async (req, res) => {
            const data = req.body;
            const result = await instructorsClassesCollection.insertOne(data);
            res.send(result);
        })

        app.get('/instructorsClasses/:email', async (req, res) => {
            const email = req.params.email;
            const result = await instructorsClassesCollection.find({ email: req.params.email }).toArray();
            res.send(result);
        });

        // get instructors classes API
        app.get('/instructorsClasses', async (req, res) => {
            const cursor = instructorsClassesCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        // instructorsClasses status approved API
        app.patch('/instructorsClasses/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { status: 'Approved' }
            };

            const result = await instructorsClassesCollection.updateOne(filter, updateDoc);

            if (result.modifiedCount === 1) {
                const classesFilter = { _id: new ObjectId(id) };

                const addedClass = await instructorsClassesCollection.findOne(classesFilter);

                if (addedClass) {
                    const classesResult = await classesCollection.insertOne({
                        _id: addedClass._id,
                        name: addedClass.name,
                        email: addedClass.email,
                        image: addedClass.image,
                        instructor: addedClass.instructor,
                        seats: parseFloat(addedClass.seats),
                        price: parseFloat(addedClass.price),
                        enrolled: parseFloat(addedClass.enrolled),
                        status: 'Approved'
                    });

                    if (classesResult.insertedId) {
                        res.send({ success: true });
                    } else {
                        res.status(500).send({ error: 'Failed to add document to classesCollection.' });
                    }
                } else {
                    res.status(404).send({ error: 'Document not found in instructorsAddedClassCollection.' });
                }
            } else {
                res.status(500).send({ error: 'Failed to update status in instructorsAddedClassCollection.' });
            }
        });

        // instructorsClasses status feedback API
        app.patch("/instructorsClasses/feedback/:id", async (req, res) => {
            try {
                const id = req.params.id;
                const { feedback } = req.body;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: { feedback: feedback },
                };
                const result = await instructorsClassesCollection.updateOne(filter, updateDoc);
                res.send(result);
            } catch (error) {
                console.error("Error adding feedback:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        });

        // instructorsClasses status denied API
        app.patch('/instructorsClasses/denied/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: { status: 'Denied' }
            }
            const result = await instructorsClassesCollection.updateOne(filter, updateDoc);
            res.send(result);
        })



        // instructors page API
        app.get('/instructors', async (req, res) => {
            const result = await instructorsCollection.find().toArray();
            res.send(result)
        })

        app.post('/instructors', async (req, res) => {
            const data = req.body;
            const result = await instructorsCollection.insertOne(data);
            res.send(result);
        })



        // popular classes API
        app.get('/popular-classes', async (req, res) => {
            const result = await classesCollection.find().sort({ enrolled: -1 }).limit(6).toArray();
            res.send(result);
        });

        // popular instructors API
        app.get('/popular-instructors', async (req, res) => {
            const result = await instructorsCollection.find().limit(6).toArray();
            res.send(result);
        });



        // classes by id API
        app.get('/classes-by-id/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classesCollection.findOne(query);
            res.send(result);
        })

        // classes update API
        app.put('/classes-by-id/:id', async (req, res) => {
            const id = req.params.id;
            const update = req.body;
            const query = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedClass = {
                $set: {
                    updateId: update._id,
                    email: update.email,
                    enrolled: update.enrolled,
                    price: update.price,
                    image: update.image,
                    instructor: update.instructor,
                    name: update.name,
                    seats: update.seats,
                    status: update.status,
                }
            }
            const result = await classesCollection.updateOne(query, updatedClass, options);
            res.send(result);
        });

    

        // payment history by email API
        app.get('/payments-by-email/:email', async (req, res) => {
            const result = await paymentCollection.find({ email: req.params.email }).sort({ date: -1 }).toArray();
            res.send(result);
        });

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const id = payment.cartItems;
            const query = { _id: new ObjectId(id) }
            const deleteResult = await bookingCollection.deleteOne(query)

            if (insertResult.acknowledged && deleteResult.deletedCount === 1) {
                const classUpdateResult = await classesCollection.updateOne(
                    { _id: new ObjectId(payment.classBooking) },
                    { $inc: { seats: -1, enrolled: 1 } }
                );

                const instructorClassUpdateResult = await instructorsClassesCollection.updateOne(
                    { _id: new ObjectId(payment.classBooking) },
                    { $inc: { seats: -1, enrolled: 1 } }
                );
            }

            res.send({ insertResult, deleteResult });
        });

        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        });




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);





app.get('/', (req, res) => {
    res.send('Summer Camp is Running')
})

app.listen(port, () => {
    console.log(`Summer Camp is Running ${port}`)
})