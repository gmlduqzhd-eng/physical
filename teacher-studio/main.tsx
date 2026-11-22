import './googleAuthClient';
import {GoogleTeacherCallback} from '../src/presentation/components/GoogleTeacherCallback';
import { createRoot } from 'react-dom/client';
import { Studio } from './Studio';
import { BrowserRouter } from 'react-router-dom';
import { setHeaderCheckLinkBase } from '../src/presentation/components/HeaderUtilities';
import { BackgroundMusicProvider } from '../src/application/BackgroundMusicContext';
import { ThemeProvider } from '../src/application/ThemeContext';
import '../src/presentation/ApplicationPalette.css';
// 화면·소리 확인 화면은 학생 앱에만 있으니 그쪽 주소로 연다.
setHeaderCheckLinkBase(import.meta.env.DEV ? 'http://127.0.0.1:5173' : 'https://physical-pi.vercel.app');
createRoot(document.getElementById('root')!).render(<ThemeProvider><BrowserRouter><BackgroundMusicProvider>{location.pathname==='/google-callback'?<GoogleTeacherCallback endpoint="studio"/>:<Studio/>}</BackgroundMusicProvider></BrowserRouter></ThemeProvider>);
