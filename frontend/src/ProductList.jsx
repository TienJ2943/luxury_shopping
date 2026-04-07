import ProductPage from "./pages/ProductPage";
import { Link } from "react-router-dom";

export default function ProductPage({ products }) {
    return (
        <>
           <h1>Products</h1>
           <ProductList products={products} />
        </>
    );
}