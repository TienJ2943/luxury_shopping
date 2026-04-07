import {
  createBrowserRouter, 
  RouterProvider
} from 'react-router-dom'


import './App.css'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import ProductsPage from './pages/ProductsPage'
import ProductPage from './pages/ProductPage'
import CartPage from './pages/CartPage'
import Layout from './Layout'
import NotFoundPage from './pages/NotFoundPage'
import { CartProvider } from './CartContext'

const routes = [{
  path: "/",
  element: <Layout />,
  errorElement: <NotFoundPage />,
  children: [
    {
      path: "/",
      element: <HomePage />
    },
    {
      path: "/about",
      element: <AboutPage />
    },
    {
      path: "/products",
      element: <ProductsPage />
    },
    {
      path: "/products/:id",
      element: <ProductPage />
    },
    {
      path: "/cart",
      element: <CartPage />
    }
  ]
}];



const router = createBrowserRouter(routes);

function App() {
  
  return (
    <CartProvider>
      <RouterProvider router={router}/>
    </CartProvider>
  );
}

export default App
