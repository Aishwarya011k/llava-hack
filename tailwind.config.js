export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Ensure this covers your project structure
  ],
  theme: {
    extend: {
      // You can add custom theme extensions here if needed
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }), // Add this line for styled scrollbars
  ],
}
