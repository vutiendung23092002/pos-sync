export const ORDER_STATUS_MAP = {
  0: "Mới",
  17: "Chờ xác nhận",
  11: "Chờ nhập kho",
  12: "Chờ in đơn",
  13: "Đã in",
  20: "Đã mua",
  1: "Đã xác nhận",
  8: "Đang đóng gói",
  9: "Chờ chuyển hàng",
  2: "Đã gửi hàng",
  3: "Đã nhận",
  16: "Đã thu tiền",
  4: "Đang hoàn",
  15: "Hoàn một phần",
  5: "Đã hoàn",
  6: "Đã huỷ",
  7: "Đã xoá",
};

export function mapOrderStatus(status) {
  return ORDER_STATUS_MAP[Number(status)] ?? "Không xác định";
}
