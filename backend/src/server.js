import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import productInfo from './product-content.js';

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5500;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/luxury_shopping';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Make sure backend/uploads exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// -----------------------------
// Middleware
// -----------------------------
app.use(cors());
app.use(express.json());

// Serve uploaded product images
// Example: backend/uploads/example.jpg
// Browser URL: http://localhost:5500/uploads/example.jpg
app.use('/uploads', express.static(uploadsDir));

// -----------------------------
// Multer image upload setup
// -----------------------------
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const safeOriginalName = file.originalname
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9.-]/g, '')
      .toLowerCase();

    cb(null, `${Date.now()}-${safeOriginalName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// -----------------------------
// Schemas and models
// -----------------------------
const productSchema = new mongoose.Schema(
  {
    id: Number,
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      default: '',
    },
    comments: [
      {
        postedBy: {
          type: String,
          required: true,
          trim: true,
        },
        text: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true }
);

const shoppingCartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        quantity: {
          type: Number,
          min: 1,
        },
      },
    ],
    total: {
      type: Number,
      default: 0,
    },
    customerName: String,
    customerEmail: String,
    status: {
      type: String,
      enum: ['created', 'paid', 'cancelled'],
      default: 'created',
    },
  },
  { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema);
const ShoppingCart = mongoose.model(
  'ShoppingCart',
  shoppingCartSchema,
  'shopping_cart'
);
const Order = mongoose.model('Order', orderSchema);

// -----------------------------
// Helper functions
// -----------------------------
function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function serialiseUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

async function getOrCreateCart(userId) {
  let cart = await ShoppingCart.findOne({ user: userId }).populate(
    'items.product'
  );

  if (!cart) {
    cart = await ShoppingCart.create({
      user: userId,
      items: [],
    });

    cart = await cart.populate('items.product');
  }

  return cart;
}

function parsePrice(price) {
  if (typeof price === 'number') return price;
  return Number(String(price).replace(/[^\d.]/g, '')) || 0;
}

function calculateCartTotal(cart) {
  return cart.items.reduce((total, item) => {
    const productPrice = parsePrice(item.product?.price);
    return total + productPrice * item.quantity;
  }, 0);
}

function normaliseQuantity(value, fallback = 1) {
  const quantity = Number(value);

  if (!Number.isFinite(quantity) || quantity < 1) {
    return fallback;
  }

  return Math.floor(quantity);
}

// -----------------------------
// Seed data
// -----------------------------
async function seedProducts() {
  try {
    const count = await Product.countDocuments();

    if (count === 0) {
      await Product.insertMany(productInfo);
      console.log('Products seeded successfully');
    }
  } catch (err) {
    console.error('Product seeding error:', err.message);
  }
}

async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@matcha.test';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      await User.create({
        name: 'Matcha Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
      });

      console.log(`Admin user created: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Admin seeding error:', err.message);
  }
}

// -----------------------------
// Database connection
// -----------------------------
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedProducts();
    await seedAdminUser();
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// -----------------------------
// Auth routes
// -----------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    await ShoppingCart.create({
      user: user._id,
      items: [],
    });

    res.status(201).json({
      token: createToken(user),
      user: serialiseUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);

    if (!passwordOk) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      token: createToken(user),
      user: serialiseUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: serialiseUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name) {
      user.name = name;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (existingEmail) {
        return res.status(409).json({ error: 'Email is already in use' });
      }

      user.email = email.toLowerCase();
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required to change password',
        });
      }

      const passwordOk = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!passwordOk) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters',
        });
      }

      user.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    res.json({
      message: 'Account updated successfully',
      user: serialiseUser(user),
      token: createToken(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { search } = req.query;

    const filter = search
      ? {
          $or: [
            { name: new RegExp(search, 'i') },
            { content: new RegExp(search, 'i') },
          ],
        }
      : {};

    const products = await Product.find(filter).sort({ name: 1 });

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE product with optional image upload
app.post(
  '/api/products',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, price, content } = req.body;

      if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' });
      }

      const product = await Product.create({
        name,
        price,
        content,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : '',
      });

      res.status(201).json(product);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// READ one product by MongoDB _id
// This matches frontend: apiFetch(`/api/products/${id}`)
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch {
    res.status(400).json({ error: 'Invalid product ID' });
  }
});

// UPDATE product with optional new image
app.put(
  '/api/products/:id',
  requireAuth,
  requireAdmin,
  upload.single('image'),
  async (req, res) => {
    try {
      const { name, price, content } = req.body;

      const updateData = {
        name,
        price,
        content,
      };

      // If admin uploads a new image, replace imageUrl.
      // If no new image is uploaded, keep the old image.
      if (req.file) {
        updateData.imageUrl = `/uploads/${req.file.filename}`;
      }

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const product = await Product.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// DELETE product
app.delete('/api/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await ShoppingCart.updateMany(
      {},
      {
        $pull: {
          items: {
            product: product._id,
          },
        },
      }
    );

    res.json({ message: 'Product deleted successfully' });
  } catch {
    res.status(400).json({ error: 'Invalid product ID' });
  }
});

// CREATE comment for one product by product ID
// Frontend should call: /api/products/${id}/comments
app.post('/api/products/:id/comments', async (req, res) => {
  try {
    const { postedBy, text } = req.body;

    if (!postedBy || !text) {
      return res
        .status(400)
        .json({ error: 'Your name and comment text are required' });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.comments.push({
      postedBy,
      text,
    });

    await product.save();

    res.status(201).json({
      message: 'Comment added successfully',
      product,
    });
  } catch {
    res.status(400).json({ error: 'Invalid product ID' });
  }
});

// READ current user's cart
app.get('/api/cart', requireAuth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    res.json({
      cart,
      total: calculateCartTotal(cart),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE item in cart / add product to cart
app.post('/api/cart/items', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body;
    const quantity = normaliseQuantity(req.body.quantity, 1);

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cart = await getOrCreateCart(req.user.id);

    const existingItem = cart.items.find((item) =>
      item.product._id.equals(product._id)
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: product._id,
        quantity,
      });
    }

    await cart.save();
    await cart.populate('items.product');

    res.status(201).json({
      cart,
      total: calculateCartTotal(cart),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// UPDATE cart item quantity
app.put('/api/cart/items/:productId', requireAuth, async (req, res) => {
  try {
    const quantity = Number(req.body.quantity);
    const cart = await getOrCreateCart(req.user.id);

    const item = cart.items.find((cartItem) =>
      cartItem.product._id.equals(req.params.productId)
    );

    if (!item) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      cart.items = cart.items.filter(
        (cartItem) => !cartItem.product._id.equals(req.params.productId)
      );
    } else {
      item.quantity = Math.floor(quantity);
    }

    await cart.save();
    await cart.populate('items.product');

    res.json({
      cart,
      total: calculateCartTotal(cart),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE one cart item
app.delete('/api/cart/items/:productId', requireAuth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    cart.items = cart.items.filter(
      (item) => !item.product._id.equals(req.params.productId)
    );

    await cart.save();
    await cart.populate('items.product');

    res.json({
      cart,
      total: calculateCartTotal(cart),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all cart items
app.delete('/api/cart', requireAuth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    cart.items = [];
    await cart.save();

    res.json({
      cart,
      total: 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin READ all users' shopping carts
app.get('/api/admin/shopping-carts', requireAuth, requireAdmin, async (req, res) => {
  try {
    const carts = await ShoppingCart.find()
      .populate('user', 'name email role')
      .populate('items.product')
      .sort({ updatedAt: -1 });

    const result = carts.map((cart) => ({
      ...cart.toObject(),
      total: calculateCartTotal(cart),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin READ all orders
app.get('/api/orders', requireAuth, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('items.productId')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE order from current user's cart
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user.id);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const user = await User.findById(req.user.id);

    const order = await Order.create({
      user: user._id,
      items: cart.items.map((item) => ({
        productId: item.product._id,
        quantity: item.quantity,
      })),
      total: calculateCartTotal(cart),
      customerName: user.name,
      customerEmail: user.email,
    });

    cart.items = [];
    await cart.save();

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one order
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const query =
      req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user.id };

    const order = await Order.findOne(query)
      .populate('user', 'name email')
      .populate('items.productId');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch {
    res.status(400).json({ error: 'Invalid order ID' });
  }
});

// UPDATE order status, admin only
app.put('/api/orders/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const allowedStatuses = ['created', 'paid', 'cancelled'];

    if (req.body.status && !allowedStatuses.includes(req.body.status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch {
    res.status(400).json({ error: 'Invalid order ID' });
  }
});

// DELETE order, admin only
app.delete('/api/orders/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ message: 'Order deleted successfully' });
  } catch {
    res.status(400).json({ error: 'Invalid order ID' });
  }
});

// -----------------------------
// Multer/global error handler
// -----------------------------
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === 'Only image files are allowed') {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Server error' });
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});