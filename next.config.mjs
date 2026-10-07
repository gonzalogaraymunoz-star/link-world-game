/** Cloudflare Pages: export the client-side LINK WORLD GAME as static assets.
 * Production on Vercel remains unchanged on main.
 * Authenticated data stays in Supabase; secrets never ship with this bundle.
 */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
