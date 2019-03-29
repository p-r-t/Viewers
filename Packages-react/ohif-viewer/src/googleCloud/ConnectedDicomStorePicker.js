import { connect } from 'react-redux';
import OHIF from 'ohif-core';
import DicomStorePicker from './DicomStorePicker.js';

const { actions } = OHIF.redux;

const isActive = a => a.active === true;

const mapStateToProps = state => {
  const activeServer = state.servers.servers.find(isActive);

  return {
    oidcStorageKey: OHIF.user.getOidcStorageKey(),
    url: activeServer && activeServer.qidoRoot
  };
};

const mapDispatchToProps = dispatch => {
  return {
    setServers: servers => {
      dispatch(actions.setServers(servers));
    }
  };
};

const ConnectedDicomStorePicker = connect(
  mapStateToProps,
  mapDispatchToProps
)(DicomStorePicker);

export default ConnectedDicomStorePicker;
