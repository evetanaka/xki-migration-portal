import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import HomePage from './pages/HomePage';
import StakePage from './pages/StakePage';
import ClaimPage from './pages/ClaimPage';
import GuidePage from './pages/GuidePage';
import AdminPage from './pages/AdminPage';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/stake" element={<StakePage />} />
          <Route path="/claim" element={<ClaimPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
