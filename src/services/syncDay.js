import { mapOrder } from "../mappers/mapOrder.js";
import { mapOrderItems } from "../mappers/mapOrderItem.js";
import { getMonthYear } from "../utils/date.js";
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
  return async function syncDay({
    date,
    dryRun = config.dryRun,
    dayIndex = 1,
    totalDays = 1,
  }) {
    const dayStartedAt = Date.now();
    const { month, year } = getMonthYear(date);
    const dayKeyValue = date.replaceAll("-", ".");
    const dayProgress = `${dayIndex}/${totalDays}`;

    logger.info(
      {
        date,
        day_index: dayIndex,
        total_days: totalDays,
        day_progress: dayProgress,
        dry_run: dryRun,
        step: "day_start",
      },
      `Day ${dayProgress} started`,
    );

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
        type: config.tableTypes.order,
        month,
        year,
      }),
      tableConfigService.getLarkTableConfig({
        type: config.tableTypes.item,
        month,
        year,
      }),
    ]);
    logger.info(
      {
        date,
        day_progress: dayProgress,
        step: "table_config",
        order_table_id: orderTableConfig.table_id,
        item_table_id: itemTableConfig.table_id,
      },
      "Lark table config resolved",
    );
    const skus = collectSkus(posResult.orders);
    const costMap = await productCostService.getProductCostMap(skus);
    const mappedOrders = posResult.orders.map((order) => mapOrder(order));
    const mappedItems = posResult.orders.flatMap((order) =>
      mapOrderItems(order, { categoryMap, costMap }),
    );
    logger.info(
      {
        date,
        day_progress: dayProgress,
        step: "mapping_complete",
        pos_orders: posResult.orders.length,
        mapped_orders: mappedOrders.length,
        mapped_items: mappedItems.length,
        requested_skus: skus.length,
        matched_costs: Object.keys(costMap).length,
      },
      "POS records mapped",
    );

    logger.info(
      { date, day_progress: dayProgress, step: "order_sync_start" },
      "Order table sync started",
    );
    const orderSummary = await syncTable({
      tableName: config.tableTypes.order,
      larkClient,
      token,
      tableConfig: orderTableConfig,
      dateFieldName: "Ngày tạo đơn",
      dayKeyFieldName: "Ngày TD",
      dayKeyValue,
      mappedRecords: mappedOrders,
      uniqueFieldName: "Unique Key",
      legacyIdentityFieldNames: ["Mã tuỳ chỉnh", "ID"],
      deleteStatuses: ["Đã xoá"],
      dryRun,
      posFetchComplete: posResult.complete,
      logger,
    });
    logger.info(
      { date, day_progress: dayProgress, step: "item_sync_start" },
      "Item table sync started",
    );
    const itemSummary = await syncTable({
      tableName: config.tableTypes.item,
      larkClient,
      token,
      tableConfig: itemTableConfig,
      dateFieldName: "Thời gian tạo đơn",
      dayKeyFieldName: "Ngày TD",
      dayKeyValue,
      mappedRecords: mappedItems,
      uniqueFieldName: "Unique Key",
      legacyIdentityFieldNames: ["ID"],
      deleteStatuses: ["Đã xoá", "Đã huỷ"],
      dryRun,
      posFetchComplete: posResult.complete,
      logger,
    });

    const summary = {
      date,
      sync_environment: config.syncEnvironment,
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
      elapsed_ms: Date.now() - dayStartedAt,
      day_progress: dayProgress,
      step: "day_complete",
    };
    logger.info(summary, `Day ${dayProgress} completed`);
    return summary;
  };
}
