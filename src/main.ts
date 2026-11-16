import { mount } from 'svelte'
import App from './App.svelte'
import { initTheme } from './lib/theme'
import './styles/tokens.css'

initTheme()

export default mount(App, { target: document.getElementById('app')! })
