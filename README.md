# Từng Ngày

Website học từ vựng công khai bằng Flashcards và Learn. Next.js 16, React 19, TypeScript, Tailwind CSS. Màn quản trị riêng; Google Sheets là nguồn nội dung. Không sử dụng Sites hosting.

## Chạy trên Mac

Yêu cầu Node.js 22 trở lên và pnpm. Trong thư mục dự án:

```sh
pnpm install
pnpm setup
pnpm dev
```

`pnpm setup` hỏi mật khẩu, tạo hash scrypt và khóa phiên vào `.env.local`. Tài khoản mặc định `ngaph082`. Mở http://127.0.0.1:3000 và http://127.0.0.1:3000/admin.

Nếu chỉ muốn xem giao diện trước khi kết nối Google, thêm `DEMO_MODE=true` vào `.env.local`. Chế độ này chỉ cung cấp dữ liệu học mẫu, không giả lập ghi dữ liệu quản trị.

## Kết nối Google Sheets

1. Tạo Google Cloud project, bật **Google Sheets API**, tạo Service Account và tải khóa JSON. Không đưa file JSON vào Git hoặc gửi trong chat.
2. Tạo một Google Sheets riêng để lưu cấu hình. Có thể để file trống, hệ thống tự tạo tab `CauHinh`. Sao chép ID ở giữa `/d/` và `/edit` trong liên kết.
3. Tải `public/Mau-tu-vung.xlsx` lên Google Drive, mở bằng Google Sheets để tạo file nội dung. Tab `TuVung` phải có dòng đầu: **ID | Bộ thẻ | Từ vựng | Phiên âm | Nghĩa**.
4. Chia sẻ **cả hai file** cho email Service Account với quyền **Chỉnh sửa**. Không cần công khai các file Sheets. Nội dung từ vựng sẽ được hiển thị công khai qua website.
5. Thêm các biến từ `.env.example` vào `.env.local`: `GOOGLE_SERVICE_ACCOUNT_EMAIL` lấy từ `client_email`, `GOOGLE_PRIVATE_KEY` lấy từ `private_key`, `CONFIG_SPREADSHEET_ID` là ID file cấu hình. Với khóa nhiều dòng, dùng dấu ngoặc kép và `\n`, hoặc dán giá trị nhiều dòng vào Vercel.
6. Khởi động lại ứng dụng, đăng nhập `/admin`, mở **Kết nối Google Sheets**, nhập liên kết file nội dung và `TuVung`, chọn **Kiểm tra kết nối**. Xác nhận tạo tab `BoThe` nếu chưa có, sau đó **Lưu nguồn dữ liệu**.

`CauHinh` giữ nguồn đang chọn; `BoThe` giữ ID/tên bộ; `TuVung` giữ từ. Không đổi tên dòng tiêu đề. ID là văn bản, không trùng và không thay đổi khi sửa từ. Khi tạo bộ trực tiếp trong Sheets, thêm ID/tên vào `BoThe` rồi dùng cùng tên tại `TuVung`. Khi đổi tên bộ, nên dùng website để cập nhật cả hai tab. Có thể sắp xếp các dòng; website tìm lại dữ liệu qua ID.

## Triển khai Vercel

1. Đưa mã nguồn lên repository GitHub riêng. Không đưa `.env.local`, khóa Google, `node_modules` hoặc `.next` lên Git. `.gitignore` đã có sẵn.
2. Trên Vercel, **Add New → Project → Import Git Repository**, chọn Next.js và thư mục gốc dự án. Lệnh build: `pnpm build`; dùng Node.js 22 hoặc 24. Lockfile đã đi kèm.
3. Tạo Redis qua Upstash/Vercel Marketplace. Hai biến `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` dùng cho giới hạn đăng nhập và khóa ghi dữ liệu chung giữa các server. Production không cho đăng nhập hoặc ghi nếu thiếu Redis.
4. Điền các biến trong `.env.example` vào môi trường **Preview** và **Production**: username, hash mật khẩu, session secret, email/khóa Google, ID file cấu hình, hai biến Redis. Lấy hash và secret từ `.env.local` đã tạo bằng `pnpm setup`; không dùng mật khẩu nguyên văn làm hash.
5. Giữ `DEMO_MODE=false` khi sử dụng dữ liệu thật. Deploy Preview trước, kiểm tra học/đăng nhập/import với một file Sheets thử, rồi deploy Production. Khi đổi biến môi trường cần redeploy.
6. Mở `/admin`, kết nối file nội dung và xác nhận. Thay đổi nguồn sau này được lưu online, không cần redeploy.

Nếu Vercel bật Deployment Protection cho Preview, kiểm tra với phiên đăng nhập Vercel của bạn. Bản Production cần truy cập được từ cửa sổ ẩn danh để đạt yêu cầu học công khai.

## Hành vi và giới hạn

- Cookie quản trị HttpOnly, Secure ở production, SameSite Strict, hết hạn sau 8 giờ. API ghi kiểm tra phiên và Origin. Mật khẩu scrypt, phiên ký HMAC.
- Giới hạn đăng nhập 15 lần/10 phút cho tài khoản quản trị; Redis giữ bộ đếm dùng chung. Giới hạn toàn tài khoản cũng có thể khiến admin phải chờ nếu có người thử đăng nhập liên tục.
- Các lần ghi qua website dùng khóa Redis và kiểm tra revision trước khi lưu, báo xung đột nếu dữ liệu đã thay đổi. Google Sheets không cung cấp giao dịch có điều kiện với chỉnh sửa trực tiếp: tránh sửa trên Sheets cùng lúc admin đang lưu/import. Hai tab nội dung được cập nhật trong cùng một Sheets batch request.
- Bộ nhớ đệm nội dung phía server tối đa 30 giây. “Tải lại” ở quản trị đọc dữ liệu mới trực tiếp. Chỉnh sửa trực tiếp trên Sheets có thể cần chờ tối đa 30 giây ở trang học.
- Tiến độ và phiên Learn lưu riêng trong IndexedDB, không gửi lên Google. Xóa dữ liệu trình duyệt làm mất tiến độ. Nội dung một bộ thay đổi thì tiến độ bộ đó được đặt lại để tránh tính kết quả trên từ cũ; đổi nguồn Sheets có không gian tiến độ riêng.
- Excel: `.xlsx`, tối đa 3 MB, 20 sheet, 2.000 dòng dữ liệu/sheet, 30 cột, giới hạn dung lượng giải nén. Không nhập ô công thức. Xem trước từng dòng; ID đã tồn tại phải chọn bỏ qua hoặc cập nhật. Dòng lỗi chỉ bị bỏ qua khi admin xác nhận.
- Chỉ cập nhật năm cột đầu của `TuVung`, hai cột đầu của `BoThe`; không đặt dữ liệu phụ cần gắn với từng từ trong các cột ngoài phạm vi này vì vị trí dòng có thể thay đổi.
- Mật khẩu không có chức năng khôi phục qua email; đổi bằng `pnpm setup` rồi cập nhật hash/secret trên Vercel. Đổi secret sẽ vô hiệu tất cả phiên quản trị cũ.

## Kiểm tra

```sh
pnpm test
pnpm typecheck
pnpm build
```

Kiểm tra tích hợp Google thật cần cấu hình và file thử: tạo/đổi tên/xóa bộ, thêm/sửa/xóa từ, import mẫu, đổi nguồn, tải lại sau khi sửa trực tiếp, và thử gọi API ghi khi chưa đăng nhập. Chạy `pnpm test:api` khi dev server đang hoạt động để kiểm tra đăng nhập, cookie và phân quyền bằng cấu hình cục bộ mà không in mật khẩu.

Thiết kế gốc giữ tại `mock-ui.html`; bản ứng dụng dùng các thư mục `app`, `components`, `lib`. Trang công khai không tự hiển thị dữ liệu mẫu khi Google lỗi; chỉ bật mẫu nếu chủ động cấu hình `DEMO_MODE=true` và chưa có kết nối Google.
