const router = require('express').Router();
const axios = require('axios');

const robokache = require('./robokache');
const handleAxiosError = require('./utils');

const messenger = 'http://robokop.renci.org:4868';

router.route('/answer')
  .post(async (req, res) => {
    const { questionId } = req.query;
    try {
      let response = await robokache.getQuestionData(questionId, req.headers.authorization);
      if (response.status === 'error') {
        console.log('Unable to get query graph.');
        return res.send(response);
      }
      const message = response;
      const config = {
        method: 'POST',
        url: `${messenger}/answer`,
        data: {
          message,
        },
        // don't parse the response
        transformResponse: [(data) => data],
      };
      // Go ask Messenger for an answer
      response = await axios(config);
      const answer = response.data;
      // Create a new answer in Robokache
      response = await robokache.createAnswer({ parent: questionId, visibility: 1 }, req.headers.authorization);
      if (response.status === 'error') {
        console.log('Unable to create a new answer.');
        return res.send(response);
      }
      const answerId = response.id;
      response = await robokache.setAnswerData(answerId, answer, req.headers.authorization);
      if (response.status === 'error') {
        console.log('Unable to save answer.');
        return res.send(response);
      }
      return res.status(200).send({ id: answerId });
    } catch (error) {
      // TODO: can we handle this better?
      return res.status(500).send(handleAxiosError(error));
    }
  });

module.exports = router;
