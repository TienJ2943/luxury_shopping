import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useCart } from "../CartContext";

export default function ProductPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [commentForm, setCommentForm] = useState({ postedBy: '', text: '' });
    const [submitting, setSubmitting] = useState(false);
    const { addToCart } = useCart();

    useEffect(() => {
        fetch(`http://localhost:5500/api/products/id/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setProduct(data);
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [id]);

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`http://localhost:5500/api/products/${encodeURIComponent(product.name)}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentForm)
            });
            const data = await res.json();
            if (res.ok) {
                // Refresh product data
                const updatedRes = await fetch(`http://localhost:5500/api/products/id/${id}`);
                const updatedProduct = await updatedRes.json();
                setProduct(updatedProduct);
                setCommentForm({ postedBy: '', text: '' });
            } else {
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setSubmitting(false);
    };

    const handleAddToCart = (product) => {
        addToCart(product);
        alert(`${product.name} added to cart!`);
    
        setTimeout(() => {
            setNotification("");
        }, 2000);
    };

    if (loading) return <p>Loading product...</p>;
    if (error) return <p>Error: {error}</p>;
    if (!product) return <p>Product not found.</p>;

    return (
        <div>
            <h1>{product.name}</h1>
            <img src={product.imageUrl} alt={product.name} style={{maxWidth: 300, margin: "auto", display: "block", borderRadius: '20px'}} />
            <p>{product.price}</p>
            <p>{product.content}</p>
            <button onClick={() => handleAddToCart(product)}>Add to Cart</button>
            <h2>Comments</h2>
            {product.comments.length === 0 ? (
                <p>No comments yet.</p>
            ) : (
                <ul>
                    {product.comments.map((comment, index) => (
                        <li key={index}><strong>{comment.postedBy}:</strong> {comment.text}</li>
                    ))}
                </ul>
            )}
            <h3>Add a Comment</h3>
            <form onSubmit={handleCommentSubmit}>
                <input
                    type="text"
                    placeholder="Your name"
                    style={{display: 'block', width: '100%', marginTop: '10px', borderRadius: '20px', padding: '10px'}}
                    value={commentForm.postedBy}
                    onChange={e => setCommentForm({...commentForm, postedBy: e.target.value})}
                    required
                />
                <textarea
                    placeholder="Your comment"
                    style={{display: 'block', width: '100%', marginTop: '10px', borderRadius: '20px', padding: '10px'}}
                    value={commentForm.text}
                    onChange={e => setCommentForm({...commentForm, text: e.target.value})}
                    required
                />
                <button type="submit" disabled={submitting} style={{display: 'block', width: '100%', marginTop: '10px', borderRadius: '20px', padding: '10px'}}>
                    {submitting ? 'Submitting...' : 'Submit Comment'}
                </button>
            </form>
        </div>
    );
}