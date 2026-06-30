import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ObraFlow - Gestión de Obras',
  description: 'Plataforma SaaS para gestión de obras: Gantt interactivo, finanzas, certificados de avance y más.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
