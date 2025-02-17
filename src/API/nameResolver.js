import axios from 'axios';
import utils from './utils';
import { api } from './baseUrlProxy';

const baseRoutes = {
  /**
   * Look up possible entities using a search string
   */
  async entityLookup(search_string, limit, cancel, type) {
    const config = {
      headers: {
        'Content-Type': 'text/plain',
      },
      params: {
        string: search_string,
        type,
        limit,
      },
      cancelToken: cancel,
    };
    try {
      const response = await api.post('/api/name_resolver', {}, config);
      return response.data;
    } catch (error) {
      if (axios.isCancel(error)) {
        return {};
      }
      return utils.handleAxiosError(error);
    }
  },
};

const routes = {
  entityLookup: baseRoutes.entityLookup,
};

export default routes;
