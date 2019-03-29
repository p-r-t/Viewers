import React, { Component } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore, combineReducers } from 'redux';
import PropTypes from 'prop-types';
import OHIF from 'ohif-core';
import './config';
import ui from './redux/ui.js';
import OHIFStandaloneViewer from './OHIFStandaloneViewer';
import WhiteLabellingContext from './WhiteLabellingContext';
import OHIFCornerstoneExtension from 'ohif-cornerstone-extension';
import OHIFVTKExtension from 'ohif-vtk-extension';
import OHIFDicomPDFExtension from 'ohif-dicom-pdf-extension';
import OHIFDicomHtmlExtension from 'ohif-dicom-html-extension';
import OHIFDicomMicroscopyExtension from 'ohif-dicom-microscopy-extension';
import { OidcProvider, reducer as oidcReducer } from 'redux-oidc';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import GCloudAdapter from './googleCloud/GCloudAdapter';
import loadHealthcareApiAdapter from './googleCloud/loadHealthcareApiAdapter.js';
import handleOIDC from './handleOIDC';
const { ExtensionManager } = OHIF.extensions;
const Icons = 'icons.svg';

const { reducers, localStorage } = OHIF.redux;
reducers.ui = ui;
reducers.oidc = oidcReducer;

const combined = combineReducers(reducers);
const store = createStore(combined, localStorage.loadState());

store.subscribe(() => {
  localStorage.saveState({
    preferences: store.getState().preferences
  });
});

const defaultButtons = [
  {
    command: 'StackScroll',
    type: 'tool',
    text: 'Stack Scroll',
    svgUrl: `${Icons}#icon-tools-stack-scroll`,
    active: false
  },
  {
    command: 'Zoom',
    type: 'tool',
    text: 'Zoom',
    svgUrl: `${Icons}#icon-tools-zoom`,
    active: false
  },
  {
    command: 'Wwwc',
    type: 'tool',
    text: 'Levels',
    svgUrl: `${Icons}#icon-tools-levels`,
    active: true
  },
  {
    command: 'Pan',
    type: 'tool',
    text: 'Pan',
    svgUrl: `${Icons}#icon-tools-pan`,
    active: false
  },
  {
    command: 'Length',
    type: 'tool',
    text: 'Length',
    svgUrl: `${Icons}#icon-tools-measure-temp`,
    active: false
  },
  /*{
      command: 'Annotate',
      type: 'tool',
      text: 'Annotate',
      svgUrl: `${Icons}#icon-tools-measure-non-target`,
      active: false
  },*/
  {
    command: 'Angle',
    type: 'tool',
    text: 'Angle',
    iconClasses: 'fa fa-angle-left',
    active: false
  },
  {
    command: 'Bidirectional',
    type: 'tool',
    text: 'Bidirectional',
    svgUrl: `${Icons}#icon-tools-measure-target`,
    active: false
  },
  {
    command: 'Brush',
    type: 'tool',
    text: 'Brush',
    iconClasses: 'fa fa-circle',
    active: false
  },
  {
    command: 'FreehandMouse',
    type: 'tool',
    text: 'Freehand',
    iconClasses: 'fa fa-star',
    active: false
  },
  {
    command: 'reset',
    type: 'command',
    text: 'Reset',
    svgUrl: `${Icons}#icon-tools-reset`,
    active: false
  }
];

const buttonsAction = OHIF.redux.actions.setAvailableButtons(defaultButtons);

store.dispatch(buttonsAction);

const availableTools = [
  { name: 'Pan', mouseButtonMasks: [1, 4] },
  { name: 'Zoom', mouseButtonMasks: [1, 2] },
  { name: 'Wwwc', mouseButtonMasks: [1] },
  { name: 'Bidirectional', mouseButtonMasks: [1] },
  { name: 'Length', mouseButtonMasks: [1] },
  { name: 'Angle', mouseButtonMasks: [1] },
  { name: 'StackScroll', mouseButtonMasks: [1] },
  { name: 'Brush', mouseButtonMasks: [1] },
  { name: 'FreehandMouse', mouseButtonMasks: [1] },
  { name: 'PanMultiTouch' },
  { name: 'ZoomTouchPinch' },
  { name: 'StackScrollMouseWheel' },
  { name: 'StackScrollMultiTouch' }
];

const toolAction = OHIF.redux.actions.setExtensionData('cornerstone', {
  availableTools
});

store.dispatch(toolAction);

/** TODO: extensions should be passed in as prop as soon as we have the extensions as separate packages and then registered by ExtensionsManager */
const extensions = [
  new OHIFCornerstoneExtension(),
  new OHIFVTKExtension(),
  new OHIFDicomPDFExtension(),
  new OHIFDicomHtmlExtension(),
  new OHIFDicomMicroscopyExtension()
];
ExtensionManager.registerExtensions(store, extensions);

// TODO[react] Use a provider when the whole tree is React
window.store = store;

function handleServers(servers) {
  if (servers) {
    OHIF.utils.addServers(servers, store);
  }
}

function handleWebWorkerInit(basename) {
  const config = {
    maxWebWorkers: Math.max(navigator.hardwareConcurrency - 1, 1),
    startWebWorkersOnDemand: true,
    webWorkerPath: basename + '/cornerstoneWADOImageLoaderWebWorker.min.js',
    taskConfiguration: {
      decodeTask: {
        loadCodecsOnStartup: true,
        initializeCodecsOnStartup: false,
        codecsPath: basename + '/cornerstoneWADOImageLoaderCodecs.min.js',
        usePDFJS: false,
        strict: false
      }
    }
  };

  cornerstoneWADOImageLoader.webWorkerManager.initialize(config);
}

/**
 * Set or update the HTML Base tag present on the document
 * to point to the provided ROOT Url.
 *
 * @param rootUrl
 */
function updateBaseTag(rootUrl) {
  const bases = document.getElementsByTagName('base');
  let baseHref = rootUrl;
  baseHref += baseHref.endsWith('/') ? '' : '/';

  if (bases.length > 1) {
    throw new Error('For some reason there is more than one base tag present.');
  } else if (bases.length === 1) {
    bases[0].href = baseHref;
  } else {
    document.write(`<base href='${baseHref}'/>`);
  }
}

class App extends Component {
  static propTypes = {
    servers: PropTypes.object,
    oidc: PropTypes.array,
    routerBasename: PropTypes.string,
    rootUrl: PropTypes.string,
    userManager: PropTypes.object,
    location: PropTypes.object,
    enableGoogleCloudAdapter: PropTypes.bool.isRequired
  };

  static defaultProps = {
    whiteLabelling: {},
    enableGoogleCloudAdapter: false
  };

  constructor(props) {
    super(props);

    let oidc = this.props.oidc;
    if (this.props.enableGoogleCloudAdapter) {
      loadHealthcareApiAdapter();
      oidc[0] = Object.assign({}, this.props.oidc[0], {
        scope:
          'email profile openid https://www.googleapis.com/auth/cloud-platform.read-only https://www.googleapis.com/auth/cloud-healthcare'
      });

      oidc[0].authRedirectUri = this.props.rootUrl + oidc[0].authRedirectUri;
    }

    this.userManager = handleOIDC(oidc, store);
    handleServers(this.props.servers);
    handleWebWorkerInit(this.props.rootUrl);
    updateBaseTag(this.props.rootUrl);
  }

  onSilentRenewError = error => {
    console.error(error);

    const LOGIN_REQUIRED = 'login_required';
    if (error.error === LOGIN_REQUIRED) {
      OHIF.user.logout();
    }
  };

  onAccessTokenExpired = () => {
    OHIF.user.logout();
  };

  render() {
    const userManager = this.userManager;

    if (userManager) {
      return (
        <Provider store={store}>
          <OidcProvider
            store={store}
            userManager={userManager}
            onSilentRenewError={this.onSilentRenewError}
            onAccessTokenExpired={this.onAccessTokenExpired}
          >
            <BrowserRouter basename={this.props.routerBasename}>
              <WhiteLabellingContext.Provider value={this.props.whiteLabelling}>
                <OHIFStandaloneViewer userManager={userManager} />
              </WhiteLabellingContext.Provider>
            </BrowserRouter>
          </OidcProvider>
        </Provider>
      );
    }

    return (
      <Provider store={store}>
        <BrowserRouter basename={this.props.routerBasename}>
          <WhiteLabellingContext.Provider value={this.props.whiteLabelling}>
            <OHIFStandaloneViewer />
          </WhiteLabellingContext.Provider>
        </BrowserRouter>
      </Provider>
    );
  }
}

export default App;
