import "../styles.css";

export const metadata = {
  title: "Definitely not Notion",
  description: "A simple shared lab notebook backed by Google Drive.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
