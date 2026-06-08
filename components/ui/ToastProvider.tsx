'use client';

import { ToastContainer } from 'react-toastify';

export function ToastProvider() {
  return (
    <ToastContainer
      position="bottom-right"
      autoClose={3500}
      hideProgressBar
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
      pauseOnHover
      theme="light"
      toastClassName="!rounded-xl !shadow-lg !border !border-gray-100 !font-sans !text-sm"
    />
  );
}
