import { createUserManager, loadUser } from 'redux-oidc';
import OHIF from 'ohif-core';

export default function handleOIDC(oidc, store) {
  if (!oidc) {
    return;
  }

  const oidcClient = oidc[0];

  const settings = {
    authority: oidcClient.authServerUrl,
    client_id: oidcClient.clientId,
    redirect_uri: oidcClient.authRedirectUri,
    silent_redirect_uri: '/silent-refresh.html',
    post_logout_redirect_uri: oidcClient.postLogoutRedirectUri,
    response_type: oidcClient.responseType || 'id_token token',
    scope: oidcClient.scope || 'email profile openid', // Note: Request must have scope 'openid' to be considered an OpenID Connect request
    automaticSilentRenew: true,
    revokeAccessTokenOnSignout: true,
    filterProtocolClaims: true,
    loadUserInfo: true,
    extraQueryParams: oidcClient.extraQueryParams
  };

  const userManager = createUserManager(settings);

  loadUser(store, userManager);

  const itemName = `oidc.user:${oidcClient.authServerUrl}:${
    settings.client_id
  }`;

  function getTokenFromStorage() {
    const userDataJSON = sessionStorage.getItem(itemName);
    const user = JSON.parse(userDataJSON);

    if (!user) {
      return;
    }

    return user.access_token;
  }

  OHIF.user.getAccessToken = function oidcGetAccessToken() {
    if (!OHIF.user.userLoggedIn) {
      throw new Error('User is not logged in.');
    }
    return getTokenFromStorage();
  };

  OHIF.user.getOidcStorageKey = function() {
    return itemName;
  };

  OHIF.user.getOidcRedirectUri = function() {
    return oidcClient.authRedirectUri;
  };

  OHIF.user.login = function oidcLogin() {
    userManager.signinRedirect();
  };

  OHIF.user.logout = function oidcLogout() {
    const config = JSON.parse(sessionStorage.getItem(itemName) || null);
    if (oidcClient.revokeUrl && config && config.access_token) {
      // OIDC from Google doesn't support signing out for some reason
      // so we revoke the token manually
      sessionStorage.removeItem(itemName);
      const revokeUrl = oidcClient.revokeUrl + config.access_token;
      fetch(revokeUrl)
        .catch(() => {})
        .then(() => {
          window.location.href = oidcClient.postLogoutRedirectUri || '/';
        });
    } else {
      // simple oidc signout behavior
      userManager.signoutRedirect();
    }
  };

  OHIF.user.userLoggedIn = () => !!getTokenFromStorage();

  return userManager;
}
