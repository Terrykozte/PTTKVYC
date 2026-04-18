# 📱 Locket Widget Clone (High-Fidelity UI/UX Mockup)

Bản mô phỏng giao diện cao cấp của ứng dụng Locket Widget được xây dựng bằng **React + TypeScript + Vite**. Dự án tập trung vào trải nghiệm người dùng (UX) mượt mà, thiết kế hiện đại (Design Aesthetics) và các tính năng tương tác thực tế.

---

## ✨ Tính năng nổi bật

### 📸 Camera & Captions
- **Giao diện Camera 1:1**: Viewfinder chuẩn mobile, tích hợp nút chuyển đổi camera và flash.
- **Captions Hiện Đại**: Thanh nhập tin nhắn được thiết kế to, đậm (`Extra Bold`), vị trí được nâng cao giúp dễ quan sát bên trong khung hình.
- **AI Magic Wand**: Nút hỗ trợ soạn tin nhắn thông minh với hiệu ứng mượt mà.

### 📍 Location & Maps
- **Smart Location Picker**: Bộ chọn vị trí với bản đồ mini, cho phép tìm kiếm địa điểm xung quanh hoặc sử dụng **Vị trí hiện tại**.
- **Memory Map (Bản đồ kỷ niệm)**:
  - **Blue Dot**: Hiển thị vị trí thực tế của bạn bằng chấm xanh nhấp nháy.
  - **Photo Pins**: Tất cả ảnh đã gửi kèm vị trí sẽ xuất hiện dưới dạng ghim ảnh (thumbnails) trên bản đồ.
  - **Hệ thống lọc**: Xem ảnh của riêng bạn hoặc của tất cả bạn bè.

### 👆 Gestures & Navigation
- **Horizontal Swipe**: Vuốt sang trái/phải để chuyển đổi giữa Lịch sử kỷ niệm, Camera chính và Danh sách Chat.
- **Premium Animations**: Sử dụng Framer Motion và CSS Transitions để tạo cảm giác ứng dụng thật.

---

## 📖 Hướng dẫn sử dụng (User Guide)

### 1. Chụp và Gửi ảnh
1. Tại màn hình chính (**Home**), nhấn nút hình tròn trắng lớn để chụp ảnh.
2. Sau khi chụp, màn hình **Preview** sẽ hiện ra.
3. Nhấn vào thanh **"Add a message"** để nhập chú thích (Caption). Chữ hiện thị sẽ to và đậm rất dễ đọc.
4. Nhấn nút **📍 Location** nếu muốn ghim vị trí. Chọn **"Sử dụng vị trí hiện tại"** để ghim vào tọa độ bạn đang đứng.
5. Chọn bạn bè trong danh sách và nhấn nút **Gửi**.

### 2. Xem Bản đồ kỷ niệm (Memory Map)
1. Tại màn hình chính, nhấn icon **Grid (Ô lưới)** ở góc dưới bên trái.
2. Bản đồ sẽ hiện ra với dấu **chấm xanh** hiển thị vị trí của bạn.
3. Những bức ảnh bạn vừa gửi kèm vị trí sẽ hiện lên dưới dạng các **Ghim ảnh**.
4. Nhấn vào một Ghim bất kỳ để xem lại ảnh và caption gắn liền với vị trí đó.

### 3. Điều hướng nhanh
- **Vuốt sang Trái**: Để xem Lịch sử kỷ niệm (Memory Calendar).
- **Vuốt sang Phải**: Để vào danh sách Chat và bạn bè.

---

## 🛠 Công nghệ sử dụng
- **Core**: React 18, TypeScript, Vite.
- **Styling**: Vanilla CSS (tập trung vào hiệu ứng kính - Glassmorphism).
- **Maps**: Leaflet + React-Leaflet (sử dụng CartoDB Voyager tiles).
- **Icons**: Lucide React / Custom SVG.

---

## 🚀 Cài đặt và Chạy thử
```bash
# Cài đặt dependencies
npm install

# Chạy ở chế độ Development
npm run dev

# Build bản Production
npm run build
```

---

