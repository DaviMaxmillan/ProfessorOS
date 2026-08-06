import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProfessorOS",
  description: "Plataforma de Gestão de Aulas e Alunos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
