import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata = {
  title: "DevSecOps Portfolio",
  description: "Portfolio DevSecOps - Omelkhir Rebei",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
