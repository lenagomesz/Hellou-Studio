'use client';

import { ToastContainer } from 'react-toastify';

export function ToastProvider() {
  return (
    <ToastContainer
      position="top-center"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss={false}
      pauseOnHover
      draggable
      limit={3}
      theme="light"
      className="hellou-toast-container"
      toastClassName={(context) => {
        const tone = {
          success: '!border-emerald-200 dark:!border-emerald-500/30',
          error: '!border-rose-200 dark:!border-rose-500/30',
          warning: '!border-orange-200 dark:!border-orange-500/30',
          info: '!border-sky-200 dark:!border-sky-500/30',
          default: '!border-pink-200 dark:!border-pink-500/30',
        }[context?.type ?? 'default'];
        return `hellou-toast !rounded-2xl !border !bg-white/95 !font-sans !text-sm !font-semibold !text-slate-800 !shadow-[0_18px_55px_-18px_rgba(131,24,67,0.4)] !backdrop-blur-xl dark:!bg-slate-900/95 dark:!text-white ${tone}`;
      }}
      progressClassName="!bg-gradient-to-r !from-pink-500 !via-rose-500 !to-orange-400"
    />
  );
}
