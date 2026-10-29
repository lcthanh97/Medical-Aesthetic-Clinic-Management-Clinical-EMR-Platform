import './globals.css';
export const metadata={title:'Dermatology Clinic EMR',description:'Project skeleton'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased bg-slate-50 text-slate-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
