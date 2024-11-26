import utils from './utils';
import { api } from './baseUrlProxy';

const routes = {
  async getDrugChemicalPairs() {
    let response;
    try {
      response = await api.post(
        '/api/explore/drug-disease',
        {
          pagination: {
            offset: 0,
            limit: 1000,
          },
        },
      );
    } catch (error) {
      return utils.handleAxiosError(error);
    }
    return response.data.rows;
  },
};

export default routes;
