import React from 'react';
import Dialog from 'react-bootstrap-dialog';

import AppConfig from './AppConfig';
import Header from './components/Header';
import Loading from './components/Loading';

import QuestionNewPres from './components/questionNew/QuestionNewPres';
import CardTypes from './components/questionNew/QuestionNewCardTypes';

class QuestionNew extends React.Component {
  constructor(props) {
    super(props);
    // We only read the communications config on creation
    this.appConfig = new AppConfig(props.config);

    this.state = {
      ready: false,
      user: {},
      name: '',
      natural: '',
      notes: '',
      query: [],
    };

    this.onCreate = this.onCreate.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.handleChangeName = this.handleChangeName.bind(this);
    this.handleChangeNatural = this.handleChangeNatural.bind(this);
    this.handleChangeNotes = this.handleChangeNotes.bind(this);
    this.handleChangeQuery = this.handleChangeQuery.bind(this);
  }

  componentDidMount() {
    this.appConfig.questionNewData(
      this.props.questionId,
      (data) => {
        // In the future we need to support forking here
        // Currently we will accpt a question id but then not actually prepopulate fields for the fork.
        //
        // 1. Check if we have valid question data coming back
        //    If questionId is empty or null the server wont give anything
        // 2. If valid question data, populate the GUI

        this.setState({
          user: data.user,
          ready: true,
        });
      },
    );
  }

  handleChangeName(e) {
    this.setState({ name: e.target.value });
  }
  handleChangeNatural(e) {
    this.setState({ natural: e.target.value });
  }
  handleChangeNotes(e) {
    this.setState({ notes: e.target.value });
  }
  handleChangeQuery(newQuery) {
    // Trim off the extra meta data in the query, dependent on node type
    const slimQuery = newQuery.map((e) => {
      let meta = {};
      const type = e.displayType;
      let label = e.nodeType;
      let isBoundType = false;
      let isBoundName = false;
      switch (e.type) {
        case CardTypes.NAMEDNODETYPE:
          isBoundType = true;
          isBoundName = true;
          label = e.name;
          meta = { name: e.name };
          break;
        case CardTypes.NODETYPE:
          isBoundType = true;
          label = e.nodeType;
          break;
        case CardTypes.NUMNODES:
          label = `?[${e.numNodesMin}...${e.numNodesMax}]`;
          // type = 'Unspecified';
          meta = { numNodesMin: e.numNodesMin, numNodesMax: e.numNodesMax };
          break;
        default:
      }
      return {
        id: e.id,
        nodeSpecType: e.type,
        type,
        label,
        isBoundName,
        isBoundType,
        meta,
      };
    });

    this.setState({ query: slimQuery });
  }

  onCreate() {
    const newBoardInfo = {
      name: this.state.name,
      natural: this.state.natural,
      notes: this.state.notes,
      query: this.state.query,
    };

    // Splash wait overlay
    this.dialogWait({
      title: 'Creating Question...',
      text: '',
      showLoading: true,
    });

    this.appConfig.questionCreate(
      newBoardInfo,
      data => this.appConfig.redirect(this.appConfig.urls.question(data)), // Success redirect to the new question page
      this.dialogMessage({
        title: 'Trouble Creating Question',
        text: 'We ran in to problems creating this question. This could be due to an intermittent network error. If you encounter this error repeatedly, please contact the system administrators.',
        buttonText: 'OK',
        buttonAction: () => {},
      }),
    );
  }
  dialogWait(inputOptions) {
    const defaultOptions = {
      title: 'Hi',
      text: 'Please wait...',
      showLoading: false,
    };
    const options = { ...defaultOptions, ...inputOptions };

    const bodyNode = (
      <div>
        {options.text}
        {options.showLoading &&
          <Loading />
        }
      </div>
    );

    // Show custom react-bootstrap-dialog
    this.dialog.show({
      title: options.title,
      body: bodyNode,
      actions: [],
      bsSize: 'large',
      onHide: () => {},
    });
  }
  dialogMessage(inputOptions) {
    const defaultOptions = {
      title: 'Hi',
      text: 'How are you?',
      buttonText: 'OK',
      buttonAction: () => {},
    };
    const options = { ...defaultOptions, ...inputOptions };

    // Show custom react-bootstrap-dialog
    this.dialog.show({
      title: options.title,
      body: options.text,
      actions: [
        Dialog.Action(
          options.buttonText,
          (dialog) => { dialog.hide(); options.buttonAction(); },
          'btn-primary',
        ),
      ],
      bsSize: 'large',
      onHide: (dialog) => {
        dialog.hide();
      },
    });
  }

  onSearch(postData) {
    this.appConfig.questionNewSearch(postData);
  }
  onValidate(postData) {
    this.appConfig.questionNewValidate(postData);
  }
  onTranslate(postData) {
    this.appConfig.questionNewTranslate(postData);
  }
  onCancel() {
    this.appConfig.back();
  }

  renderLoading() {
    return (
      <Loading />
    );
  }
  renderLoaded() {
    return (
      <div>
        <Header
          config={this.props.config}
          user={this.state.user}
        />
        <QuestionNewPres
          query={this.state.query}
          handleChangeName={this.handleChangeName}
          handleChangeNatural={this.handleChangeNatural}
          handleChangeNotes={this.handleChangeNotes}
          handleChangeQuery={this.handleChangeQuery}
          callbackCreate={this.onCreate}
          callbackSearch={this.onSearch}
          callbackValidate={this.onValidate}
          callbackTranslate={this.onTranslate}
          callbackCancel={this.onCancel}
        />
        <Dialog ref={(el) => { this.dialog = el; }} />
      </div>
    );
  }
  render() {
    return (
      <div>
        {!this.state.ready && this.renderLoading()}
        {this.state.ready && this.renderLoaded()}
      </div>
    );
  }
}

export default QuestionNew;
