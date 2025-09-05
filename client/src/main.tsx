import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { SocketProvider } from './contexts/SocketContext';
import SimpleApp from './SimpleApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <SocketProvider>
        <SimpleApp />
      </SocketProvider>
    </Provider>
  </React.StrictMode>
);
