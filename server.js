var express = require("express");
let app = express();
const cors = require("cors");
app.use(cors());
app.use(express.json());
app.set('json spaces', 3);
const path = require('path');
let PropertiesReader = require("properties-reader");
// Load properties from the file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbName = properties.get('db.name');
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1;//declare variable
app.use(express.static(path.join(__dirname)));


async function connectDB() {
  try {
    client.connect();
    console.log('Connected to MongoDB');
    db1 = client.db('Website');
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }
}

connectDB(); //call the connectDB function to connect to MongoDB database

//Optional if you want the get the collection name from the Fetch API in test3.html then
app.param('collectionName', async function (req, res, next, collectionName) {
  req.collection = db1.collection(collectionName);
  /*Check the collection name for debugging if error */
  console.log('Middleware set collection:', req.collection.collectionName);
  next();
});

// Serve your index.html file when accessing the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// get all data from our collection in Mongodb
app.get('/collections/products', async function (req, res, next) {
  try {
    const results = await db1.collection('Products').find({}).toArray();

    console.log('Retrieved data:', results);

    res.json(results); // Send the products to the frontend

  } catch (err) {
    console.error('Error fetching docs', err.message);
    
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/collections1/:collectionName', async function (req, res, next) {
  const results = await req.collection.find({}, { limit: 3, sort: { price: -1 } })
});

app.post('/collections/:collectionName', async function (req, res, next) {
  try {

  }
  catch {

  }
});

app.delete('/collections/:collectionName/:id', async function (req, res, next) {
  try {
    console.log('Recieved Request :', req.params.id);

    const results = await req.collection.deleteOne({ _id: new ObjectId(req.params.id) });

    console.log('Deleted data:', results);

    res.json((results.deleteCount === 1)) ? { msg: "Success" } : { msg: "Error" }
  }
  catch {

  }
});

app.put('/collections/:collectionName/:id', async function (req, res, next) {
  try {
    console.log("recieved Request :", req.params.id);

    const results = await req.collection.updateOne({ _id: new ObjectId(req.params.id) });

  }
  catch {

  }
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'An error occurred' });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});