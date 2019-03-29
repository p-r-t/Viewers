import React, { Component } from 'react';
import PropTypes from 'prop-types';
import OHIF from 'ohif-core';
import { withRouter } from 'react-router-dom';
import { StudyList } from 'react-viewerbase';
import ConnectedHeader from '../connectedComponents/ConnectedHeader.js';
import moment from 'moment';
import Modal from 'react-modal';
import ConnectedDicomFilesUploader from '../googleCloud/ConnectedDicomFilesUploader';
import ConnectedDicomStorePicker from '../googleCloud/ConnectedDicomStorePicker';

class StudyListWithData extends Component {
  state = {
    searchData: {},
    studies: null,
    error: null,
    modalComponentId: null
  };

  static propTypes = {
    patientId: PropTypes.string,
    server: PropTypes.object,
    user: PropTypes.object,
    history: PropTypes.object
  };

  static rowsPerPage = 25;
  static defaultSort = { field: 'patientName', order: 'desc' };

  static studyListDateFilterNumDays = 25000; // TODO: put this in the settings
  static defaultStudyDateFrom = moment()
    .subtract(StudyListWithData.studyListDateFilterNumDays, 'days')
    .toDate();
  static defaultStudyDateTo = new Date();

  componentDidMount() {
    if (!this.props.server) {
      this.setState({
        modalComponentId: 'DicomStorePicker'
      });
    } else {
      this.searchForStudies();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.server !== prevProps.server) {
      this.setState({
        modalComponentId: null
      });

      this.searchForStudies();
    }
  }

  searchForStudies = (
    searchData = {
      currentPage: 0,
      rowsPerPage: StudyListWithData.rowsPerPage,
      studyDateFrom: StudyListWithData.defaultStudyDateFrom,
      studyDateTo: StudyListWithData.defaultStudyDateTo,
      sortData: StudyListWithData.defaultSort
    }
  ) => {
    const { server } = this.props;
    const filter = {
      patientId: searchData.patientId,
      patientName: searchData.patientName,
      accessionNumber: searchData.accessionNumber,
      studyDescription: searchData.studyDescription,
      modalitiesInStudy: searchData.modalities,
      studyDateFrom: searchData.studyDateFrom,
      studyDateTo: searchData.studyDateTo,
      limit: searchData.rowsPerPage,
      offset: searchData.currentPage * searchData.rowsPerPage
    };

    // TODO: add sorting
    const promise = OHIF.studies.searchStudies(server, filter);

    // Render the viewer when the data is ready
    promise
      .then(studies => {
        if (!studies) {
          studies = [];
        }

        const { field, order } = searchData.sortData;
        const sortedStudies = studies
          .sort(function(a, b) {
            if (order === 'desc') {
              if (a[field] < b[field]) {
                return -1;
              }
              if (a[field] > b[field]) {
                return 1;
              }
              return 0;
            } else {
              if (a[field] > b[field]) {
                return -1;
              }
              if (a[field] < b[field]) {
                return 1;
              }
              return 0;
            }
          })
          .map(study => {
            study.studyDate = moment(study.studyDate, 'YYYYMMDD').format(
              'MMM DD, YYYY'
            );
            return study;
          });

        this.setState({
          studies: sortedStudies
        });
      })
      .catch(error => {
        this.setState({
          error: true
        });

        throw new Error(error);
      });
  };

  onImport = () => {
    //console.log('onImport');
  };

  openModal = modalComponentId => {
    this.setState({
      modalComponentId
    });
  };

  closeModal = () => {
    this.setState({ modalComponentId: null });
  };

  onSelectItem = studyInstanceUID => {
    this.props.history.push(`/viewer/${studyInstanceUID}`);
  };

  onSearch = searchData => {
    this.searchForStudies(searchData);
  };

  render() {
    if (this.state.error) {
      return <div>Error: {JSON.stringify(this.state.error)}</div>;
    } else if (this.state.studies === null && !this.state.modalComponentId) {
      return <div>Loading...</div>;
    }

    let modalContent = '';
    if (this.state.modalComponentId === 'DicomStorePicker') {
      return <ConnectedDicomStorePicker />;
    } else if (this.state.modalComponentId === 'DicomFilesUploader') {
      return <ConnectedDicomFilesUploader />;
    }

    return (
      <>
        <ConnectedHeader home={true} user={this.props.user} />
        <button onClick={() => this.openModal('DicomStorePicker')}>
          Open Dicom Store Picker
        </button>
        <button onClick={() => this.openModal('DicomFilesUploader')}>
          Open Dicom Uploader
        </button>
        <Modal
          isOpen={this.state.modalComponentId}
          onRequestClose={this.closeModal}
          contentLabel="Example Modal"
        >
          <div>{modalContent}</div>
        </Modal>
        <StudyList
          studies={this.state.studies}
          studyListFunctionsEnabled={false}
          onImport={this.onImport}
          onSelectItem={this.onSelectItem}
          pageSize={this.rowsPerPage}
          defaultSort={StudyListWithData.defaultSort}
          studyListDateFilterNumDays={
            StudyListWithData.studyListDateFilterNumDays
          }
          onSearch={this.onSearch}
        />
      </>
    );
  }
}

export default withRouter(StudyListWithData);
