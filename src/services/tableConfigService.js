export function createTableConfigService(dbClient) {
  return {
    getLarkTableConfig: (params) => dbClient.getLarkTableConfig(params),
  };
}
