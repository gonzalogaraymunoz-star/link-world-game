/** LINK WORLD GAME: exportación estática para Cloudflare Pages.
 * La identidad y el estado real permanecen en Supabase; este frontend no ejecuta
 * lógica sensible en el navegador ni duplica los datos operativos.
 */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
};

export default nextConfig;
