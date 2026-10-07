/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  safelist: [
    'from-amber-600/30', 'via-slate-800/40', 'to-purple-950/50',
    'from-blue-400/20', 'via-sky-600/30', 'to-indigo-900/40',
    'from-cyan-600/30', 'via-blue-800/30', 'to-slate-900/50',
    'from-zinc-500/20', 'via-slate-600/30', 'to-neutral-800/40',
    'from-slate-500/20', 'via-blue-900/20', 'to-slate-950/40',
    'from-amber-500/30', 'via-orange-500/20', 'to-sky-900/30',
    'text-emerald-500', 'text-amber-500', 'text-orange-500', 'text-rose-500', 'text-purple-600'
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
