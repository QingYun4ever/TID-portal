import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import './index.css';
import { AuthProvider, SettingsProvider, ToastProvider } from './lib/store';
const root = document.getElementById('root');
if (!root)
    throw new Error('#root not found');
createRoot(root).render(_jsx(React.StrictMode, { children: _jsx(BrowserRouter, { children: _jsx(SettingsProvider, { children: _jsx(AuthProvider, { children: _jsx(ToastProvider, { children: _jsx(App, {}) }) }) }) }) }));
