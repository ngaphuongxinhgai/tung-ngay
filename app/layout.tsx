import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Từng Ngày · Học từ vựng',description:'Học từ vựng tiếng Trung qua thẻ ghi nhớ và luyện tập, theo nhịp của bạn.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="vi"><body>{children}</body></html>}
