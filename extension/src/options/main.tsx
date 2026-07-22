import { createRoot } from 'react-dom/client';
import { OptionsApp } from './OptionsApp';
import './options.css';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<OptionsApp />);
}
