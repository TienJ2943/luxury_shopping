import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../CartContext";


export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { addToCart } = useCart();

    useEffect(() => {
        fetch('http://localhost:5500/api/products')
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, []);

    const handleAddToCart = (product) => {
        addToCart(product);
        alert(`${product.name} added to cart!`);
    
        setTimeout(() => {
            setNotification("");
        }, 2000);
    };

    if (loading) return <p>Loading products...</p>;
    if (error) return <p>Error: {error}</p>;

    return (
        <div>
            <h1>Products</h1>
            <div className="products-grid">
                {products.map(p => (
                    <div className="product-card" key={p._id}>
                        <img src={p.imageUrl} alt={p.name} style={{maxWidth:200, margin: "auto", display: "block", borderRadius: '20px'}} />
                        <h3>{p.name}</h3>
                        
                        <Link to={`/products/${p._id}`} className="view-button">View</Link>
                        <button onClick={() => handleAddToCart(p)} style={{marginLeft: '10px'}}>Add to Cart</button>
                    </div>
                ))}
            </div>
        </div>
    );
}