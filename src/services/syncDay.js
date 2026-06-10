import { mapOrder } from "../mappers/mapOrder.js";
import { mapOrderItems } from "../mappers/mapOrderItem.js";
import { getMonthYear, getVietnamDayUnixRange } from "../utils/date.js";
import { syncTable } from "./syncTable.js";

function collectSkus(orders) {
  return [
    ...new Set(
      orders
        .flatMap((order) => order.items || [])
        .map((item) => item?.variation_info?.product_display_id?.trim())
        .filter(Boolean),
    ),
  ];
}

export function createSyncDay({
  config,
  posClient,
  larkClient,
  tableConfigService,
  productCostService,
  logger,
  token,
}) {
  return async function syncDay({ date, dryRun = config.dryRun }) {
    const dateRange = getVietnamDayUnixRange(date);
    const { month, year } = getMonthYear(date);

    const categoryMap = await posClient.fetchCategories(config.pos);
    const posResult = await posClient.fetchAllOrdersByDay({
      date,
      ...config.pos,
    });
    if (posResult.complete !== true || !Array.isArray(posResult.orders)) {
      throw new Error(`POS fetch for ${date} was not confirmed complete`);
    }

    const [orderTableConfig, itemTableConfig] = await Promise.all([
      tableConfigService.getLarkTableConfig({
        type: "facebook_order_td",
        month,
        year,
      }),
      tableConfigService.getLarkTableConfig({
        type: "facebook_order_item_td",
        month,
        year,
      }),
    ]);
    const costMap = await productCostService.getProductCostMap(
      collectSkus(posResult.orders),
    );
    const mappedOrders = posResult.orders.map((order) => mapOrder(order));
    const mappedItems = posResult.orders.flatMap((order) =>
      mapOrderItems(order, { categoryMap, costMap }),
    );

    const orderSummary = await syncTable({
      tableName: "facebook_order_td",
      larkClient,
      token,
      tableConfig: orderTableConfig,
      dateFieldName: "Ngày tạo đơn",
      dateRange,
      mappedRecords: mappedOrders,
      uniqueFieldName: "Unique Key",
      deleteStatuses: ["Đã xoá"],
      dryRun,
      posFetchComplete: posResult.complete,
      logger,
    });
    const itemSummary = await syncTable({
      tableName: "facebook_order_item_td",
      larkClient,
      token,
      tableConfig: itemTableConfig,
      dateFieldName: "Thời gian tạo đơn",
      dateRange,
      mappedRecords: mappedItems,
      uniqueFieldName: "Unique Key",
      deleteStatuses: ["Đã xoá", "Đã huỷ"],
      dryRun,
      posFetchComplete: posResult.complete,
      logger,
    });

    const summary = {
      date,
      pos_orders: posResult.orders.length,
      order: {
        create: orderSummary.createCount,
        update: orderSummary.updateCount,
        delete: orderSummary.deleteCount,
        duplicates_deleted: orderSummary.duplicateDeleteCount,
      },
      item: {
        create: itemSummary.createCount,
        update: itemSummary.updateCount,
        delete: itemSummary.deleteCount,
        duplicates_deleted: itemSummary.duplicateDeleteCount,
      },
      dry_run: dryRun,
    };
    logger.info(summary, "Daily sync completed");
    return summary;
  };
}
