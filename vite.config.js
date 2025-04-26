export default defineConfig({
  plugins: [react()],
  base: './', // Añade esta línea para usar rutas relativas
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})