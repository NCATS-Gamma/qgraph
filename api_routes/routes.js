const fs = require('fs');
const path = require('path');

const router = require('express').Router();
const axios = require('axios');

const robokache = require('./robokache');
const { handleAxiosError } = require('./utils');
const services = require('./services');
const external_apis = require('./external');

const { getDrugDiseasePairs } = require('../explore/query/drug-disease');

const samples = JSON.parse(fs.readFileSync(path.join(__dirname, './sample-query-cache.json')));

router.use('/', external_apis);

router.use('/robokache', robokache.router);

router.route('/quick_answer')
  .post(async (req, res) => {
    // if this is a sample query, load the response from the cache JSON:
    for (let i = 0; i < samples.length; i += 1) {
      const { query, response } = samples[i];
      if (JSON.stringify(req.body) === JSON.stringify(query)) {
        res.send(response);
        return;
      }
    }

    const { ara } = req.query;
    const ara_url = services[ara];
    const config = {
      method: 'POST',
      url: ara_url,
      data: req.body,
      transformResponse: [(data) => data],
    };

    let answer;
    try {
      // Go ask ARA for an answer
      const response = await axios(config);

      // Validate json
      try {
        answer = JSON.parse(response.data);
        res.send(answer);
      } catch (error) {
        res.send({
          status: 'error',
          message: `Recieved unparseable JSON response from ${ara}`,
        });
      }
    } catch (err) {
      res.send({
        status: 'error',
        message: `Error from ${ara_url}`,
      });
    }
  });

router.route('/explore/drug-disease')
  .post(async (req, res) => {
    const { sort, filters, pagination } = req.body;

    if (!pagination || !Number.isInteger(pagination.offset) || !Number.isInteger(pagination.limit)) return res.status(400).json({ error: 'Missing pagination' });
    if (pagination.limit < 1 || pagination.offset < 0) return res.status(400).json({ error: 'Invalid limit or offset value' });

    const limit = Math.min(pagination.limit, 500);
    const { offset } = pagination;

    try {
      const results = await getDrugDiseasePairs({ sort, filters, pagination: { limit, offset } });
      return res.status(200).json(results);
    } catch (error) {
      console.error('Error in explore page query:', error, req.body);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

router.route('/answer')
  .post(async (req, res) => {
    const { questionId, ara } = req.query;
    try {
      let response = await robokache.routes.getQuestionData(questionId, req.headers.authorization);
      if (response.status === 'error') {
        return res.send(response);
      }
      const message = response;
      const ara_url = services[ara];
      const config = {
        method: 'POST',
        url: ara_url,
        data: message,
        // don't parse the response
        transformResponse: [(data) => data],
      };

      let answer;
      try {
        // Go ask ARA for an answer
        response = await axios(config);

        // Validate json
        try {
          answer = JSON.parse(response.data);
        } catch (error) {
          answer = {
            status: 'error',
            message: `Recieved unparseable JSON response from ${ara}`,
          };
        }
      } catch (err) {
        // Save error in robokache
        answer = handleAxiosError(err);
      }

      // Create a new answer in Robokache
      response = await robokache.routes.createAnswer({ parent: questionId, visibility: 2 }, req.headers.authorization);
      if (response.status === 'error') {
        return res.send(response);
      }
      const answerId = response.id;
      response = await robokache.routes.setAnswerData(answerId, answer, req.headers.authorization);
      if (response.status === 'error') {
        return res.send(response);
      }
      return res.status(200).send({ id: answerId });
    } catch (error) {
      // TODO: can we handle this better?
      return res.status(500).send(handleAxiosError(error));
    }
  });

module.exports = router;
