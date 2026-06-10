# POS PagesFM to Lark Bitable Sync

Node.js 20 CLI thay thế workflow n8n đồng bộ đơn PagesFM POS sang hai bảng
Lark Bitable:

- `facebook_order_td`
- `facebook_order_item_td`

Mỗi ngày được xử lý tuần tự. Dữ liệu POS và Lark đều được phân trang, dedupe bằng
`Unique Key`, sau đó batch create/update/delete tối đa 100 records/request.

## Cài đặt local

```bash
cp .env.example .env
npm install
npm test
```

Chạy dry-run:

```bash
FROM=2026-03-01 TO=2026-03-31 DRY_RUN=true npm run sync
```

Chạy ghi dữ liệu:

```bash
FROM=2026-03-01 TO=2026-03-31 npm run sync
```

Trên PowerShell:

```powershell
$env:FROM="2026-03-01"
$env:TO="2026-03-31"
$env:DRY_RUN="true"
npm run sync
```

Nếu không truyền `FROM` và `TO`, chương trình đồng bộ từ ngày hiện tại theo giờ
Việt Nam trừ `SYNC_LOOKBACK_DAYS` đến ngày hiện tại. Mặc định là `14`.

## Biến môi trường

| Tên | Bắt buộc | Mô tả |
| --- | --- | --- |
| `POS_API_KEY` | Có | PagesFM POS API key |
| `POS_SHOP_ID` | Có | Shop ID dùng trong POS endpoint |
| `DATABASE_URL` | Có | PostgreSQL connection string |
| `LARK_APP_ID` | Có | Lark internal app ID |
| `LARK_APP_SECRET` | Có | Lark internal app secret |
| `FROM` | Không | Ngày đầu `YYYY-MM-DD`; phải đi cùng `TO` |
| `TO` | Không | Ngày cuối `YYYY-MM-DD`; phải đi cùng `FROM` |
| `DRY_RUN` | Không | `false` mặc định |
| `SYNC_LOOKBACK_DAYS` | Không | `14` mặc định |
| `LOG_LEVEL` | Không | Pino log level, mặc định `info` |

Table ID và Base ID được đọc theo tháng/năm từ
`han_lark_base.tables`. Giá vốn được đọc từ
`kiot_legiahan.product_cost` bằng parameterized query.

## GitHub Actions

Workflow: `.github/workflows/sync-pos-lark.yml`.

Tạo các repository secrets:

```txt
POS_API_KEY
POS_SHOP_ID
DATABASE_URL
LARK_APP_ID
LARK_APP_SECRET
```

Workflow hỗ trợ `workflow_dispatch` với `from`, `to`, `dry_run`; lịch tự động chạy
mỗi 2 giờ. `concurrency.group=pos-lark-sync` và PostgreSQL advisory lock cùng ngăn
hai tiến trình chạy chồng nhau.

## Trường Lark bắt buộc

### Order table

Technical:

```txt
Unique Key
Last Synced At
```

Business:

```txt
Mã tuỳ chỉnh
ID
Mã vận đơn
Ngày tạo đơn
Tháng CD
Tháng TD
Ngày CD
NV xử lý
Người tạo
Trạng thái
Tổng tiền
Doanh thu bán hàng
Doanh số bán hàng
Giá trị hoàn
Tổng giá nhập SP
Tổng giảm giá
Giảm giá bằng điểm
Phí VC thu của khách
Số tiền khách phải trả
Phí trả cho ĐVVC
COD
Điểm thưởng nhận được
Điểm thưởng đã sử dụng
Tổng điểm thưởng
Gồm các mã sản phẩm
Mã khuyến mãi
Ghi chú để in
Miễn phí ship
Đơn vị VC
Trạng thái giao hàng
Khách hàng
Số điện thoại
Khách mới/cũ
Tỉnh/Thành phố
Địa chỉ
Nguồn
Page ID
Post ID
Ad ID
Dòng thời gian cập nhật trạng thái
```

### Order item table

Technical:

```txt
Unique Key
Order Unique Key
Last Synced At
```

Business:

```txt
ID
Mã tuỳ chỉnh
Order ID
Thời gian tạo đơn
Trạng thái
Người xử lý
Giảm giá đơn hàng
Tên sản phẩm
Mã sản phẩm
Danh mục
Số lượng
Số lượng hoàn
Đơn giá
Giảm giá sản phẩm
Tổng giá nhập sản phẩm
Giá vốn Kiot
Giá trị bán trước hoàn
Giá trị bán
Ghi chú sản phẩm
Dòng thời gian cập nhật trạng thái
Tháng CD
Ngày CD
Tháng TD
Page ID
Nguồn
Post ID
Ad ID
```

Các field ngày Lark phải là Date field nhận Unix milliseconds. `Danh mục` phải
chấp nhận mảng giá trị.

## Chống trùng

- Order key: `order:{order_id}`, fallback `order:system:{system_id}`.
- Item key: `item:{order_id}:{item_id}`, fallback
  `item:system:{system_id}:{item_id}`.
- POS trùng key: giữ bản có `updated_at` mới nhất, sau đó `inserted_at`; bằng nhau
  thì giữ phần tử cuối.
- Lark trùng key: giữ record có `created_time` mới nhất, xóa các record còn lại.
- Existing key được update; chỉ missing key mới được create.

## Quy tắc xóa

- Order: xóa trạng thái `Đã xoá`.
- Item: xóa trạng thái `Đã xoá` hoặc `Đã huỷ`.
- Xóa duplicate Lark theo `Unique Key`.
- Xóa record Lark không còn trong POS chỉ khi toàn bộ pagination POS của ngày đã
  hoàn tất thành công.
- `DRY_RUN=true` chỉ lập và log kế hoạch, không gọi batch write.

## Vận hành

- Mốc ngày POS luôn được tính bằng UTC+7, không phụ thuộc timezone runner.
- Sync ngày chạy tuần tự để giảm rate limit.
- HTTP 429, 5xx và lỗi mạng retry tối đa 5 lần với backoff 1/2/4/8/16 giây;
  `Retry-After` được ưu tiên.
- Nếu một ngày lỗi, tiến trình dừng và exit code khác 0. Không có bước xóa sau
  một lần tải POS dở dang.
- Cấu hình bảng được resolve lại theo từng ngày, nên range qua tháng được hỗ trợ.
