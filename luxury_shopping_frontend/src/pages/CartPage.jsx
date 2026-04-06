import { useState } from 'react';
import { useCart } from '../CartContext';

export default function CartPage() {
    const { cart, updateQuantity, removeFromCart, clearCart, getTotal } = useCart();
    const [customerInfo, setCustomerInfo] = useState({ name: '', email: '' });
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const handleCheckout = async () => {
        if (!customerInfo.name || !customerInfo.email) {
            alert('Please enter your name and email');
            return;
        }
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }

        setCheckoutLoading(true);
        try {
            const order = {
                items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
                total: getTotal(),
                customerName: customerInfo.name,
                customerEmail: customerInfo.email
            };

            const res = await fetch('http://localhost:5500/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(order)
            });

            if (res.ok) {
                alert('Order placed successfully!');
                clearCart();
                setCustomerInfo({ name: '', email: '' });
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (err) {
            alert('Error: ' + err.message);
        }
        setCheckoutLoading(false);
    };

    if (cart.length === 0) {
        return (
            <div>
                <h1>Your Cart</h1>
                <p>Your cart is empty.</p>
            </div>
        );
    }

    return (
        <div>
            <h1>Your Cart</h1>
            <div>
                {cart.map(item => (
                    <div key={item._id} style={{border: '1px solid #ccc', margin: '10px', padding: '10px', display: 'flex', alignItems: 'center'}}>
                        <img src={item.imageUrl} alt={item.name} style={{width: '100px', marginRight: '10px'}} />
                        <div style={{flex: 1}}>
                            <h3>{item.name}</h3>
                            <p>{item.price}</p>
                        </div>
                        <div>
                            <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                            <span style={{margin: '0 10px'}}>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                            <button onClick={() => removeFromCart(item._id)} style={{marginLeft: '10px'}}>Remove</button>
                        </div>
                    </div>
                ))}
            </div>
            <div style={{marginTop: '20px'}}>
                <h2>Total: ${getTotal().toFixed(2)}</h2>
                <button onClick={clearCart} style={{marginRight: '10px'}}>Clear Cart</button>
            </div>
            <div style={{marginTop: '20px'}}>
                <h2>Checkout</h2>
                <input
                    type="text"
                    placeholder="Your Name"
                    value={customerInfo.name}
                    onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                    required
                />
                <input
                    type="email"
                    placeholder="Your Email"
                    value={customerInfo.email}
                    onChange={e => setCustomerInfo({...customerInfo, email: e.target.value})}
                    required
                />
                <button onClick={handleCheckout} disabled={checkoutLoading}>
                    {checkoutLoading ? 'Placing Order...' : 'Place Order'}
                </button>
            </div>
        </div>
    );
}