import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No <StrictMode> on purpose: in development it runs effects twice, which would show
// every page-load GET request twice in the teaching panel and confuse students.
createRoot(document.getElementById('root')).render(<App />);
