import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import productInfo from './product-content.js';

const app = express();
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/luxury_shopping').then(async () => {
  console.log('Connected to MongoDB');
  await seedProducts();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Seed products from the source file and replace any old product data
async function seedProducts() {
  try {
    await Product.deleteMany({});
    await Product.insertMany(productInfo);
    console.log('Products seeded successfully');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

// Define Product schema
const productSchema = new mongoose.Schema({
  id: Number,
  name: String,
  price: String,
  imageUrl: String,
  content: String,
  comments: [{ postedBy: String, text: String }]
});

const Product = mongoose.model('Product', productSchema);

// Define Order schema
const orderSchema = new mongoose.Schema({
  items: [{ productId: mongoose.Schema.Types.ObjectId, quantity: Number }],
  total: Number,
  customerName: String,
  customerEmail: String
});

const Order = mongoose.model('Order', orderSchema);

/*app.get('/hello', function(req, res) {
  res.send('Welcome to the Luxury Shopping Backend from a GET request!');
});

app.get('/hello/:name', function(req, res) {
  res.send('Welcome ' + req.params.name + ' to the Luxury Shopping Backend from a GET request with a parameter!');
});

app.post('/hello', function(req, res) {
  res.send('Welcome ' + req.body.name + ' to the Luxury Shopping Backend from a POST request!');
});*/

// Routes for products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/id/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products/:name/comments', async (req, res) => {
  try {
    const { postedBy, text } = req.body;
    const product = await Product.findOne({ name: new RegExp(req.params.name, 'i') });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    product.comments.push({ postedBy, text });
    await product.save();
    res.json({ message: 'Comment added successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Routes for orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().populate('items.productId');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const { items, total, customerName, customerEmail } = req.body;
    const order = new Order({ items, total, customerName, customerEmail });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('items.productId');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { items, total, customerName, customerEmail } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { items, total, customerName, customerEmail }, { new: true });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(5500, '0.0.0.0', function() {
    console.log('Server is running on port 5500');
});