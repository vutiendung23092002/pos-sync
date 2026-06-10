export function createProductCostService(dbClient) {
  return {
    getProductCostMap: (skus) => dbClient.getProductCostMap(skus),
  };
}
