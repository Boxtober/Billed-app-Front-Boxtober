// import $ from 'jquery';
// global.$ = global.jQuery = $;

require('@testing-library/jest-dom/extend-expect');
require('whatwg-fetch');

// Import CommonJS (Jest 26)
const $ = require('jquery');
global.$ = $;
global.jQuery = $;

// Évite les crash si le code appelle la modale Bootstrap
$.fn = $.fn || {};
$.fn.modal = jest.fn();

// Mocks utiles
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  writable: true,
});
global.alert = jest.fn();
window.scrollTo = jest.fn();