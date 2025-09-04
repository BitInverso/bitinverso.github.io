import './legacy.js';
import '../css/styles.css';

// Example facades (kept to ensure availability)
import { triggerEarthquake } from './battle/earthquake.js';
import { openDictionary } from './ui/dictionary.js';

// Re-expose
window.triggerEarthquake = window.triggerEarthquake || triggerEarthquake;
window.openDictionary = window.openDictionary || openDictionary;
