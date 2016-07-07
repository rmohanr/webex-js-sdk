import React from 'react';
import {Provider} from 'react-redux';
import {Router, Route} from 'react-router';

import App from './containers/app';
import AuthPage from './containers/pages/auth';
import CallPage from './containers/pages/call';

let base = `/`;
if (window.location.href.includes(`4000`)) {
  base = `/app`;
}

if (window.location.href.toLowerCase().includes(`iremmel`)) {
  base = `/pages/iremmel/squared-js-sdk/app`;
}

if (window.location.href.toLowerCase().includes(`webexsquared`)) {
  base = `/pages/WebExSquared/squared-js-sdk/app`;
}

export default function Root({history, store}) {
  return (
    <Provider store={store}>
      <div>
        <Router history={history}>
          <Route component={App} path={base}>
            <Route component={AuthPage} path="auth" />
            <Route component={CallPage} path="call" />
          </Route>
        </Router>
      </div>
    </Provider>
  );
}

Root.propTypes = {
  history: React.PropTypes.object.isRequired,
  store: React.PropTypes.object.isRequired
};
