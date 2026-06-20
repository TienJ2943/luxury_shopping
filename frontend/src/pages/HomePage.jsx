import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <section className="hero" align="center" justify="center" text="center">
      <div>
        <h1>Neo got your Mac-cha</h1>
        <p>
          A single-page matcha shopping cart app with live product search, user login,
          database-backed carts, checkout, and an admin cart dashboard.
        </p>
        <div className="card-actions">
          <Link className="button" to="/products">Shop Products</Link>
          <Link className="button secondary" to="/register">Create Account</Link>
        </div>
      </div>
    </section>
  );
}
