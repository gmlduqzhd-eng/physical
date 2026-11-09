import './googleAuthClient';
import {GoogleTeacherCallback} from '../src/presentation/components/GoogleTeacherCallback';
import { createRoot } from 'react-dom/client';
import { Studio } from './Studio';
import { BrowserRouter } from 'react-router-dom';
import { BackgroundMusicProvider } from '../src/application/BackgroundMusicContext';
import { ThemeProvider } from '../src/application/ThemeContext';
import '../src/presentation/ApplicationPalette.css';
createRoot(document.getElementById('root')!).render(<ThemeProvider><BrowserRouter><BackgroundMusicProvider>{location.pathname==='/google-callback'?<GoogleTeacherCallback endpoint="studio"/>:<Studio/>}</BackgroundMusicProvider></BrowserRouter></ThemeProvider>);
