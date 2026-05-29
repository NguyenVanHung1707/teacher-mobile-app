# 📱 Ứng Dụng Di Động Giảng Viên - Lecturer Companion App (React Native Native App)

Ứng dụng di động native dành cho Giảng viên là trợ lý giảng đường đắc lực chạy trên nền tảng **React Native**, mang đến cho quý thầy cô giải pháp quản lý giảng dạy, điểm danh thông minh và tương tác lớp học phần từ xa vô cùng nhanh chóng và hiện đại.

Ứng dụng tương thích hoàn toàn với cả hai nền tảng iOS và Android, hỗ trợ giao diện thích ứng theo chế độ Sáng/Tối (Light/Dark mode) và tích hợp hệ thống bảo mật sinh trắc học phần cứng tiên tiến nhất.

---

## 🌟 Các Tính Năng Nổi Bật (Key Features)

### 1. Đăng Nhập Sinh Trắc Học Tốc Hành (FaceID / Fingerprint)
*   **Mở khóa 1 chạm**: Loại bỏ việc nhập mật khẩu phức tạp trên bàn phím di động. Giảng viên có thể đăng nhập bằng Vân tay hoặc nhận diện khuôn mặt tức thì nhờ sự tích hợp của `react-native-keychain` và cơ chế **Quay vòng Token tự động (Token Rotation)** từ cổng Keycloak SSO.
*   **An toàn cấp phần cứng**: Thông tin xác thực được mã hóa và bảo vệ trực tiếp bên trong bộ vi xử lý an toàn của thiết bị (Android Keystore / iOS Keychain).

### 2. Thông Báo Đẩy Thời Gian Thực & Định Tuyến Sâu (FCM)
*   **Kết nối giảng đường 24/7**: Tích hợp Firebase Cloud Messaging (FCM) lập tức gửi thông báo đẩy đến điện thoại của giảng viên khi có sinh viên gửi yêu cầu phê duyệt tham gia lớp học phần hoặc có bài thảo luận học thuật mới trên diễn đàn.
*   **Deep Linking linh hoạt**: Chỉ cần chạm vào thông báo trên thanh trạng thái, ứng dụng tự động khởi động và đưa giảng viên đến chính xác trang Phê duyệt hoặc phòng Thảo luận tương ứng, hoạt động mượt mà ở cả chế độ chạy ngầm (Background) và tắt hẳn (Killed).

### 3. Quản Lý Lớp Học Phần & Điểm Danh Timeline Sinh Động
*   **Quản lý danh sách lớp học**: Xem danh sách các lớp học phần đang phụ trách, thông tin sinh viên tham gia và phê duyệt thành viên mới nhanh chóng.
*   **Timeline điểm danh trực quan (Student Details)**: Theo dõi lịch sử điểm danh của từng sinh viên dưới dạng dòng thời gian (Timeline) có chiều sâu, hiển thị rõ ràng nhãn xanh lá Emerald (Đi học) và đỏ Ruby (Vắng mặt) nổi bật, giúp đánh giá nhanh tình hình chuyên cần.

### 4. Thời Khóa Biểu Giảng Dạy (Timetable Screen)
*   **Quản lý lịch dạy tiện lợi**: Tra cứu lịch giảng dạy theo ngày và tuần trực quan, tích hợp đầy đủ thông tin phòng học, thời gian ca dạy và sơ đồ giảng đường.

### 5. Soạn Thảo Đề Thi Kháng Gian Lận (Create Assessment)
*   **Cấu hình đề thi di động**: Giảng viên có thể thiết lập các bài kiểm tra trực tuyến trực quan ngay trên điện thoại:
    *   Nhập tên đề thi, cấu hình thời gian thi và hạn nộp bài.
    *   **Bật/tắt bảo mật vị trí GPS**: Yêu cầu học viên phải ở đúng tọa độ phòng thi mới được làm bài.
    *   **Bật/tắt giám sát Camera AI**: Yêu cầu học viên bật camera để AI phát hiện các hành vi gian lận (quay đầu, thiết bị lạ,...) thời gian thực.
*   **Mẫu tệp câu hỏi**: Các nút xem tệp mẫu câu hỏi trắc nghiệm/tự luận được thiết kế sắc nét, hỗ trợ tối đa việc soạn đề.

### 6. Hồ Sơ Cá Nhân & Quản Lý Đổi Mật Khẩu
*   **Hồ sơ giảng viên**: Xem chi tiết thông tin cá nhân bao gồm họ tên, mã số giảng viên, email liên hệ, trạng thái phê duyệt tài khoản và ngày tham gia hệ thống.
*   **Đổi mật khẩu tài khoản (Secure Change Password)**: Phím chức năng **"ĐỔI MẬT KHẨU TÀI KHẢN"** tích hợp ngay trong thẻ Hồ sơ, cho phép giảng viên chủ động thay đổi mật khẩu an toàn với cơ chế đối khớp mật khẩu cũ thông qua Keycloak SSO.

---

## 💎 Ngôn Ngữ Thiết Kế Đẳng Cấp (Aesthetics)
*   **Micro-Animations & Smooth Transitions**: Cảm giác chạm vuốt mượt mà, hiệu ứng chuyển tab êm ái cùng độ tương phản tối đa trên cả giao diện sáng và tối.
*   **Theme-Adaptive**: Hệ thống tự động đồng bộ theo cấu hình giao diện tối (Dark mode) của thiết bị di động, đem lại phong cách công nghệ tinh tế, chống mỏi mắt hiệu quả.
