export default function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <p>
        © {currentYear} Manuel Azancot de Menezes & Francisco José Mayor Arroyo. Chess
        Multiverse. All rights reserved.
      </p>
    </footer>
  );
}