import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch, resolveAssetUrl } from '../api';
import { useAuth } from '../AuthContext';
import { useCart } from '../CartContext';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError('');
      try {
        const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
        const data = await apiFetch(`/api/products${query}`);
        setProducts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(loadProducts, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const visibleProducts = useMemo(() => products, [products]);

  async function handleAddToCart(product) {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      await addToCart(product);
      setNotice(`${product.name} added to cart.`);
      setTimeout(() => setNotice(''), 1800);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <div className="section-header">
        <div>
          <h1>Products</h1>
          <p>Browse the matcha collection and search live as you type.</p>
        </div>
        <input
          className="search-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search matcha, latte, powder..."
        />
      </div>

      {notice && <p className="success-message">{notice}</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {loading && <p>Loading products...</p>}

      {!loading && visibleProducts.length === 0 && <p>No products match your search.</p>}

      <div className="product-grid">
        {visibleProducts.map((product) => (
          <article className="product-card" key={product._id}>
            {product.imageUrl && <img src={resolveAssetUrl(product.imageUrl)} alt={product.name} />}
            <h3>{product.name}</h3>
            <p className="price" justify="center">
              {product.price}
            </p>
            <div className="card-actions">
              <Link className="button secondary" to={`/products/${product._id}`}>View</Link>
              <button className="button" onClick={() => handleAddToCart(product)}>Add to Cart</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
