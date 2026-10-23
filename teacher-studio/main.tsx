import { createRoot } from 'react-dom/client';
import { Studio } from './Studio';
import { BrowserRouter } from 'react-router-dom';
import { BackgroundMusicProvider } from '../src/application/BackgroundMusicContext';
import { ThemeProvider } from '../src/application/ThemeContext';
import '../src/presentation/CleanBluePalette.css';
createRoot(document.getElementById('root')!).render(<ThemeProvider><BrowserRouter><BackgroundMusicProvider><Studio/></BackgroundMusicProvider></BrowserRouter></ThemeProvider>);
