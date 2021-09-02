import axios from 'axios';
import yaml from 'js-yaml';

import utils from './utils';

const biolink_url = `${window.location.origin}/api/external/biolink`;

const routes = {
  /**
   * Get biolink model specification
   */
  async getModelSpecification() {
    const config = {
      url: biolink_url,
      method: 'GET',
    };
    let response;
    try {
      response = await axios(config);
    } catch (error) {
      return utils.handleAxiosError(error);
    }
    // Parse yaml into JSON
    try {
      return yaml.safeLoad(response.data);
    } catch (error) {
      return {
        status: 'error',
        message:
        'Failed to load Biolink model specification: could not parse YAML',
      };
    }
  },
};

export default routes;
