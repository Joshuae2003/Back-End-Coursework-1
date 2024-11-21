var express = require("express");
let app = express();
const cors = require("cors");

// Set up CORS to allow requests from specific origins
app.use(cors({
  origin: "https://joshuae2003.github.io",
  methods: "GET,POST,PUT,DELETE",
  allowedHeaders: "Content-Type"
}));

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Set JSON formatting to include 3 spaces for better readability
app.set('json spaces', 3);

const path = require('path');
let PropertiesReader = require("properties-reader");

// Load database connection properties from a file
let propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
let properties = PropertiesReader(propertiesPath);

// Extract values from the properties file for MongoDB connection
const dbPrefix = properties.get('db.prefix');
const dbHost = properties.get('db.host');
const dbName = properties.get('db.name');
const dbUser = properties.get('db.user');
const dbPassword = properties.get('db.password');
const dbParams = properties.get('db.params');

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// Construct MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;

// Create a MongoDB client
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Declare a variable to hold the database instance

// Serve static files (e.g., frontend assets) from the current directory
app.use(express.static(path.join(__dirname)));

// Function to connect to MongoDB
async function connectDB() {
  try {
    client.connect(); // Connect to the MongoDB server
    console.log('Connected to MongoDB');
    db1 = client.db('Website'); // Select the database
  } catch (err) {
    console.error('MongoDB connection error:', err); // Log connection errors
  }
}

connectDB(); // Call the function to establish the database connection

// Middleware to dynamically assign a collection to a request
app.param('collectionName', async function (req, res, next, collectionName) {
  req.collection = db1.collection(collectionName);
  console.log('Middleware set collection:', req.collection.collectionName);
  next();
});

// Endpoint to fetch all products from the "Products" collection
app.get('/collections/courses', async function (req, res, next) {
  try {
    const results = await db1.collection('Products').find({}).toArray(); // Fetch all documents
    console.log('Retrieved data:', results); // Log retrieved data
    res.json(results); // Send the data as a JSON response
  } catch (err) {
    console.error('Error fetching docs', err.message); // Log errors
    res.status(500).json({ error: 'Failed to fetch products' }); // Return error response
  }
});

// Endpoint to create a new order
app.post('/collections/orders', async function (req, res, next) {
  try {
    const { orderId, name, surname, phone, totalPrice, courses } = req.body; // Extract request data

    // Validate request body
    if (!orderId || !name || !surname || !phone || !totalPrice || !courses || !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Invalid or missing fields in the request body' });
    }

    // Create an order object
    const order = {
      orderId,
      name,
      surname,
      phone,
      totalPrice,
      courses,
      createdAt: new Date()
    };

    // Insert the order into the "Orders" collection
    const results = await db1.collection('Orders').insertOne(order);

    res.status(201).json({
      message: 'Order created successfully',
      orderId: results.insertedId // Return the inserted order's ID
    });
  } catch (err) {
    console.error('Error creating order:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to create order' }); // Return error response
  }
});

// Endpoint to delete a product by title
app.delete('/collections/products/title/:title', async function (req, res) {
  try {
    const productTitle = req.params.title; // Extract product title from the URL
    console.log(`[DELETE] Request to delete product with title: ${productTitle}`);

    // Delete the product by its title
    const result = await db1.collection('Products').deleteOne({ title: productTitle });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Product not found' }); // Return 404 if not found
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product by title:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to delete product' }); // Return error response
  }
});

// Endpoint to update product availability
app.put('/collections/products/update-availability', async function (req, res) {
  try {
    const { products } = req.body; // Extract product data from request body

    // Validate the request body
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid or missing products data' });
    }

    // Update availability for each product
    for (const product of products) {
      if (!product.title || !product.quantity) {
        return res.status(400).json({ error: 'Each product must have a title and quantity' });
      }

      const result = await db1.collection('Products').updateOne(
        { title: product.title },
        { $inc: { availableInventory: -product.quantity } }
      );

      if (result.matchedCount === 0) {
        console.warn(`Product with title "${product.title}" not found`); // Warn if product not found
      }
    }

    res.status(200).json({ message: 'Product availability updated successfully' });
  } catch (err) {
    console.error('Error updating product availability:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to update product availability' });
  }
});

// Endpoint to search for products
app.get('/collections/products/search', async function (req, res) {
  try {
    const { search = '', sortKey = 'title', sortOrder = 'asc' } = req.query; // Extract query params

    console.log('Search Query:', search); // Log search query
    console.log('Sort Key:', sortKey, 'Sort Order:', sortOrder); // Log sorting options

    // Build search query
    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    const sortOptions = { [sortKey]: sortOrder === 'asc' ? 1 : -1 }; // Determine sort order

    const results = await db1.collection('Products').find(query).sort(sortOptions).toArray();

    console.log('Search Results:', results); // Log search results
    res.status(200).json(results); // Return results to frontend
  } catch (err) {
    console.error('Error fetching products:', err.message); // Log errors
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Global error handler for unhandled errors
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ error: 'An error occurred' });
});

// Start the server and listen on a port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
