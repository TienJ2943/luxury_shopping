import { Link } from "react-router-dom";
import './App.css';

export default function NavBar() {
    return (
        <div className="site-header">
            <h1 className="site-title">Neo got your Mac-cha</h1>
            <nav className="navbar">
                <ul>
                    <li><Link to='/'>Home</Link></li>
                    <li><Link to='/about'>About</Link></li>
                <li><Link to='/products'>Products</Link></li>
                <li><Link to='/cart'>Cart</Link></li>
            </ul>
        </nav>
        </div>
    );
}