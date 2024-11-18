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

app.post('/collections/orders', async function (req, res, next) {
  try {
    // Extract data from the request body
    const { name, surname, totalPrice, courses } = req.body;

    // Check if required fields are provided
    if (!name || !surname || !totalPrice || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid or missing fields in the request body' });
    }

    // Create an order object
    const order = {
      name,
      surname,
      totalPrice,
      courses,
      createdAt: new Date() // Add a timestamp for when the order was created
    };

    // Insert the order into the Orders collection
    const results = await db1.collection('Orders').insertOne(order);

    // Send success response
    res.status(201).json({
      message: 'Order created successfully',
      orderId: results.insertedId
    });
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.delete('/collections/products/title/:title', async function (req, res) {
  try {
    const productTitle = req.params.title;

    // Delete the product by title
    const result = await db1.collection('Products').deleteOne({ title: productTitle });

    // Check if the product was found and deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product by title:', err.message);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

app.put('/collections/products/update-availability', async function (req, res) {
  try {
    const { products } = req.body;

    // Validate the request body
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid or missing products data' });
    }

    // Iterate over the products and update availability for each
    for (const product of products) {
      if (!product.title || !product.quantity) {
        return res.status(400).json({ error: 'Each product must have a title and quantity' });
      }

      // Update the product's available inventory
      const result = await db1.collection('Products').updateOne(
        { title: product.title },
        { $inc: { availableInventory: -product.quantity } }
      );

      // Check if the product was found and updated
      if (result.matchedCount === 0) {
        console.warn(`Product with title "${product.title}" not found`);
      }
    }

    // Respond with success
    res.status(200).json({ message: 'Product availability updated successfully' });
  } catch (err) {
    console.error('Error updating product availability:', err.message);
    res.status(500).json({ error: 'Failed to update product availability' });
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