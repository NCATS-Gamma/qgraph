'''
Blueprint for /api/questions endpoints
'''

from datetime import datetime
import re
import random
import string
import logging
from flask import jsonify, request
from flask_security import auth_required, current_user
from flask_restful import Resource

from manager.util import getAuthData, get_tasks
from manager.question import list_questions, list_questions_by_username, Question
from manager.tasks import update_kg, answer_question
from manager.setup import api
from manager.user import User, get_user_by_email
import manager.logging_config

logger = logging.getLogger(__name__)

# question conversion
class QuestionConversionAPI(Resource):
    def post(self):
        """
        Create new question
        ---
        tags: [question]
        parameters:
          - in: body
            name: question
            description: simple question format
            schema:
                $ref: '#/definitions/Question'
            required: true
        responses:
            200:
                description: converted question
                schema:
                    $ref: '#/definitions/Question'
        """
        user_id = 1
        name = request.json['name']
        natural_question = request.json['natural']
        notes = request.json['notes']
        nodes, edges = Question.dictionary_to_graph(request.json['machine_question'])
        qid = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase + string.digits, k=12))
        q = Question(id=qid, user_id=user_id, name=name, natural_question=natural_question, notes=notes, nodes=nodes, edges=edges)

        return q.toJSON(), 201

api.add_resource(QuestionConversionAPI, '/questions/convert')

# New Question Submission
class QuestionsAPI(Resource):
    @auth_required('session', 'basic')
    def post(self):
        """Create new question
        ---
        tags: [question]
        parameters:
          - in: body
            name: name
            description: "name of question"
            required: true
          - in: body
            name: natural_question
            description: "natural-language question"
            required: false
          - in: body
            name: notes
            description: "notes"
            required: false
          - in: body
            name: query
            description: "machine-readable question"
            required: true
        responses:
            200:
                description: "message"
                type: string
        """
        auth = request.authorization
        if auth:
            user_email = auth.username
            user = get_user_by_email(user_email)
            user_id = user.id
        else:
            user_id = current_user.id
            user_email = current_user.email
        logger.debug(f"Creating new question for user {user_email}.")
        qid = ''.join(random.choices(string.ascii_uppercase + string.ascii_lowercase + string.digits, k=12))
        if 'machine_question' in request.json:
            nodes, edges = Question.dictionary_to_graph(request.json['machine_question'])
            natural_question = request.json['natural']
            q = Question(request.json, natural_question=natural_question, id=qid, user_id=user_id, nodes=nodes, edges=edges)
        else:
            q = Question(request.json, id=qid, user_id=user_id)

        if not 'RebuildCache' in request.headers or request.headers['RebuildCache'] == 'true':
            # To speed things along we start a answerset generation task for this question
            # This isn't the standard answerset generation task because we might also trigger a KG Update
            ug_task = update_kg.signature(args=[q.hash], kwargs={'question_id':qid, 'user_email':user_email}, immutable=True)
            as_task = answer_question.signature(args=[q.hash], kwargs={'question_id':qid, 'user_email':user_email}, immutable=True)
            task = answer_question.apply_async(args=[q.hash], kwargs={'question_id':qid, 'user_email':user_email},
                link_error=ug_task|as_task)
        else:
            task = answer_question.apply_async(args=[q.hash], kwargs={'question_id':qid, 'user_email':user_email})

        return qid, 201

    def get(self):
        """Get list of questions
        ---
        tags: [question]
        responses:
            200:
                description: list of questions
                schema:
                    type: "array"
                    items:
                        $ref: '#/definitions/Question'
        """
        user = getAuthData()
        question_list = list_questions()
        # user_question_list = list_questions_by_username(user['username'])
        # nonuser_question_list = list_questions_by_username(user['username'], invert=True)

        tasks = get_tasks().values()

        # filter out the SUCCESS/FAILURE tasks
        tasks = [t for t in tasks if not (t['state'] == 'SUCCESS' or t['state'] == 'FAILURE') or t['state'] == 'REVOKED']

        # get question hashes
        question_hashes = []
        for t in tasks:
            if not t['args']:
                question_hashes.append(None)
                continue
            match = re.match(r"[\[(]'(.*)',?[)\]]", t['args'])
            if not match:
                question_hashes.append(None)
                continue
            question_hashes.append(match.group(1))

        # split into answer and update tasks
        task_types = ['answering' if t['name'] == 'tasks.answer_question' else
                    'refreshing KG' if t['name'] == 'tasks.update_kg' else
                    'something?' for t in tasks]

        def augment_info(question):
            answerset_timestamps = [a.timestamp for a in question.answersets]
            latest_idx = answerset_timestamps.index(max(answerset_timestamps)) if answerset_timestamps else None
            latest_answerset_id = question.answersets[latest_idx].id if latest_idx else None
            latest_answerset_timestamp = question.answersets[latest_idx].timestamp if latest_idx else None
            q = question.toJSON()
            q['user_email'] = question.user.email
            q.pop('user_id')
            q.pop('nodes')
            q.pop('edges')
            tasks = [task_types[i] for i in [j for j, h in enumerate(question_hashes) if h == question.hash]]
            return {'latest_answerset_id': latest_answerset_id,
                    'latest_answerset_timestamp': latest_answerset_timestamp.isoformat() if latest_answerset_timestamp else None,
                    'tasks': tasks,
                    **q}

        return {'user': user,\
                'questions': [augment_info(q) for q in question_list]}, 200

api.add_resource(QuestionsAPI, '/questions/')
