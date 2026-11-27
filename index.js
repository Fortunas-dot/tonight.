import { registerRootComponent } from 'expo';

import App from './App';
import { installErrorLog } from './src/errorLog';
import { ErrorBoundary } from './src/ErrorBoundary';

// Errors and crashes go to the error log (dashboard › Errors) from the very start.
installErrorLog();

function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

registerRootComponent(Root);
