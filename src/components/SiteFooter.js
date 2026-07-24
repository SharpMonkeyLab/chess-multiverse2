export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <img
        className="site-footer-brand"
        src="/brand/lockup.png"
        alt="Chess Multiverse"
        width={180}
        height={180}
      />
      <p>
        © {currentYear} Manuel Azancot de Menezes & Francisco José Mayor Arroyo. Chess
        Multiverse. All rights reserved.
      </p>
    </footer>
  );
}
