import '@fontsource/cascadia-code/400.css';
import './ui/estilo.css';
import { iniciarApp } from './ui/app';

const raiz = document.getElementById('app');
if (raiz) iniciarApp(raiz);
