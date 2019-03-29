import { connect } from 'react-redux';

import DicomFileUploader from './DicomFileUploader.js';
import OHIF from 'ohif-core';

const isActive = a => a.active === true;

const mapStateToProps = state => {
  const activeServer = state.servers.servers.find(isActive);

  return {
    oidcStorageKey: OHIF.user.getOidcStorageKey(),
    url: activeServer && activeServer.qidoRoot
  };
};

const ConnectedDicomFileUploader = connect(
  mapStateToProps,
  null
)(DicomFileUploader);

export default ConnectedDicomFileUploader;
