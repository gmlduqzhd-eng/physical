import { createRoot } from 'react-dom/client';
import { Studio } from './Studio';
import { BrowserRouter } from 'react-router-dom';
import { BackgroundMusicProvider } from '../src/application/BackgroundMusicContext';
createRoot(document.getElementById('root')!).render(<BrowserRouter><BackgroundMusicProvider><Studio/></BackgroundMusicProvider></BrowserRouter>);
