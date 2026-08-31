/**
 * `import '../global.css'` in app/_layout.tsx is what hands the compiled Tailwind
 * output to NativeWind's Metro transformer. TypeScript has no idea what a .css
 * file is, so without this declaration the import is a hard error.
 *
 * NativeWind's own `nativewind/types` covers the `className` prop but not CSS
 * side-effect imports.
 */
declare module '*.css';
